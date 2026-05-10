"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ListTodo,
  Loader2,
  MessagesSquare,
  MousePointer2,
  Paperclip,
  Rocket,
  RotateCcw,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AI_MODELS,
  DEFAULT_MODEL_ID,
  getModel,
  type AiModelId,
} from "@/lib/ai-models";
import { VoiceButton } from "@/components/project/voice-button";
import { PlanCard } from "@/components/project/plan-card";
import { useGenerationProgress } from "@/components/project/use-generation-progress";

type ChatMode = "build" | "plan" | "discuss";

type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  /** Data URL (base64). MVP - dla obrazow. */
  dataUrl?: string;
};

type ChatPanelProps = {
  projectId: string;
  initialPrompt: string;
  /** Zapisane wiadomosci z bazy. Jezeli niepuste -> zaden auto-start. */
  initialMessages?: UIMessage[];
  hasFiles: boolean;
  selectMode: boolean;
  onSelectModeChange: (value: boolean) => void;
  /** Model wybrany w CreationHero (przekazany przez URL). */
  initialModel?: string;
  /** Tryb wybrany w CreationHero. */
  initialMode?: ChatMode;
  /** Gdy true, auto-start jest wstrzymany (kreator pytań jest aktywny). */
  wizardBlocked?: boolean;
  /** Notifies the parent whenever the streaming state changes. */
  onStreamingChange?: (streaming: boolean) => void;
};

export type ChatPanelHandle = {
  appendHint: (text: string) => void;
  /** Sends the hint as a chat message immediately (used by auto-fix). */
  submitHint: (text: string) => void;
  /**
   * Called by WizardPanel after the user answers questions.
   * Forces PLAN mode so the AI presents the plan before writing any files.
   * The PlanCard "Approve" button then switches to BUILD mode.
   */
  startWithPlanPrompt: (enrichedPrompt: string) => void;
  /** Start with the enriched prompt in the current mode (used when wizard is skipped). */
  startWithPrompt: (enrichedPrompt: string) => void;
};

const MAX_ATTACHMENT_BYTES = 1024 * 1024;

export const ChatPanel = forwardRef<ChatPanelHandle, ChatPanelProps>(function ChatPanel(
  {
    projectId,
    initialPrompt,
    initialMessages,
    hasFiles,
    selectMode,
    onSelectModeChange,
    initialModel,
    initialMode,
    wizardBlocked,
    onStreamingChange,
  },
  ref,
) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>(initialMode ?? "build");
  const [model, setModel] = useState<AiModelId>(
    (initialModel as AiModelId | undefined) ?? DEFAULT_MODEL_ID,
  );
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  // Track which plan cards have been acted on (approved/skipped)
  const [consumedPlans, setConsumedPlans] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  // Ref-based mode: body() reads modeRef.current at request time, avoiding
  // the stale-closure problem when the Approve button switches plan→build.
  const modeRef = useRef<ChatMode>(initialMode ?? "build");
  function setModeSync(newMode: ChatMode) {
    modeRef.current = newMode;
    setMode(newMode);
  }

  // Jednorazowe nadpisanie trybu na potrzeby konkretnego wyslanego komunikatu.
  // Uzywane przez "Kontynuuj generowanie" — chcemy wyslac jedna wiadomosc w
  // trybie 'continue', ale nie zmieniac stalego trybu UI.
  const oneShotModeRef = useRef<"continue" | null>(null);

  // Czy mamy zapisane wiadomosci w bazie? Jezeli tak -> nie auto-startujemy generacji.
  const hasStoredHistory = (initialMessages?.length ?? 0) > 0;

  // model is kept in deps so transport recreates when model changes.
  // mode is NOT in deps — we read modeRef.current inside body() at request time.
  // body() is a callback invoked by DefaultChatTransport outside of render, so
  // accessing modeRef.current there is intentional and safe.
  /* eslint-disable react-hooks/refs */
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/generate",
        body: () => {
          const m = oneShotModeRef.current ?? modeRef.current;
          oneShotModeRef.current = null;
          return { projectId, model, mode: m };
        },
      }),
    [projectId, model],
  );
  /* eslint-enable react-hooks/refs */

  const { messages, sendMessage, status, error, stop } = useChat({
    messages: initialMessages ?? [],
    transport,
    onFinish: () => {
      router.refresh();
    },
  });

  // Persystencja wiadomosci czatu w bazie po kazdej zakonczonej iteracji AI.
  // Wywolywana tylko po zakonczeniu streamu (status zmienia sie na "ready"
  // po byciu w "submitted"/"streaming").
  const lastPersistedCountRef = useRef(initialMessages?.length ?? 0);
  useEffect(() => {
    if (status !== "ready") return;
    if (messages.length === lastPersistedCountRef.current) return;
    lastPersistedCountRef.current = messages.length;

    void fetch(`/api/projects/${projectId}/messages`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, parts: m.parts })),
      }),
    }).catch(() => {});
  }, [status, messages, projectId]);

  // Auto-start generacji TYLKO przy pierwszym wejsciu w nowy projekt:
  //  - mamy initialPrompt
  //  - brak zapisanej historii w bazie (hasStoredHistory)
  //  - brak wygenerowanych plikow uzytkownika
  //  - wizard nie jest aktywny (wizardBlocked)
  useEffect(() => {
    if (
      !startedRef.current &&
      initialPrompt &&
      !hasFiles &&
      !hasStoredHistory &&
      !wizardBlocked &&
      status === "ready" &&
      messages.length === 0
    ) {
      startedRef.current = true;
      // Read image attachments from sessionStorage (uploaded in CreationHero)
      let imageParts: Array<{ type: "file"; mediaType: string; url: string }> = [];
      try {
        const stored = sessionStorage.getItem("wybitna_attachments");
        if (stored) {
          const arr = JSON.parse(stored) as Array<{ dataUrl?: string; name?: string }>;
          imageParts = arr
            .filter((a) => a.dataUrl?.startsWith("data:image/"))
            .map((a) => ({
              type: "file" as const,
              mediaType: a.dataUrl!.split(";")[0].replace("data:", ""),
              url: a.dataUrl!,
            }));
          sessionStorage.removeItem("wybitna_attachments");
        }
      } catch {
        // sessionStorage unavailable
      }

      if (imageParts.length > 0) {
        const parts: Array<{ type: "text"; text: string } | { type: "file"; mediaType: string; url: string }> = [
          { type: "text", text: initialPrompt },
          ...imageParts,
        ];
        sendMessage({ parts } as unknown as Parameters<typeof sendMessage>[0]);
      } else {
        sendMessage({ text: initialPrompt });
      }
    }
  }, [
    initialPrompt,
    hasFiles,
    hasStoredHistory,
    wizardBlocked,
    sendMessage,
    status,
    messages.length,
  ]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Streaming partial code to the editor preview.
  // For writeFile: stream the content char-by-char while input-streaming.
  // For patchFile: emit the final patched content when the tool output is ready
  //   (patchFile output includes the full patched `content` field).
  useEffect(() => {
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      for (const part of m.parts) {
        type StreamingPart = {
          type: string;
          state?: string;
          input?: { path?: string; content?: string };
          output?: { ok?: boolean; path?: string; content?: string };
        };
        const sp = part as StreamingPart;

        // writeFile — stream while typing
        if (
          sp.type === "tool-writeFile" &&
          sp.state === "input-streaming" &&
          sp.input?.path &&
          typeof sp.input.content === "string"
        ) {
          window.dispatchEvent(
            new CustomEvent("wybitna:partial-write", {
              detail: { path: sp.input.path, content: sp.input.content },
            }),
          );
        }

        // patchFile — emit final patched content once the tool output is available
        if (
          sp.type === "tool-patchFile" &&
          sp.state === "output-available" &&
          sp.output?.ok &&
          sp.output.path &&
          typeof sp.output.content === "string"
        ) {
          window.dispatchEvent(
            new CustomEvent("wybitna:partial-write", {
              detail: { path: sp.output.path, content: sp.output.content },
            }),
          );
        }
      }
    }
  }, [messages]);

  useImperativeHandle(
    ref,
    () => ({
      appendHint: (text: string) => {
        setInput((prev) => (prev ? `${prev}\n${text}` : text));
      },
      submitHint: (text: string) => {
        // Auto-fix path: send straight to the model in build mode so the AI
        // can patch the project without an extra plan round-trip.
        setModeSync("build");
        sendMessage({ text });
      },
      startWithPlanPrompt: (enrichedPrompt: string) => {
        if (startedRef.current) return;
        startedRef.current = true;
        // Force plan mode so AI presents the plan before writing any files.
        setModeSync("plan");
        sendMessage({ text: enrichedPrompt });
      },
      startWithPrompt: (enrichedPrompt: string) => {
        if (startedRef.current) return;
        startedRef.current = true;
        sendMessage({ text: enrichedPrompt });
      },
    }),
    [sendMessage],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  function submit() {
    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0) return;

    // Faza 3.2: image-to-code. Obrazki wysylamy jako oddzielne parts (Claude Vision).
    const imageAttachments = attachments.filter((a) =>
      a.type.startsWith("image/"),
    );
    const otherAttachments = attachments.filter(
      (a) => !a.type.startsWith("image/"),
    );

    const attachmentText =
      otherAttachments.length > 0
        ? `\n\n[Zalaczniki: ${otherAttachments
            .map((a) => `${a.name} (${humanSize(a.size)})`)
            .join(", ")}]`
        : "";

    if (imageAttachments.length > 0) {
      // Multimodalne wiadomosci — text + obrazki (Claude Vision).
      const parts: Array<
        | { type: "text"; text: string }
        | { type: "file"; mediaType: string; url: string }
      > = [{ type: "text", text: `${trimmed}${attachmentText}` }];
      for (const a of imageAttachments) {
        if (typeof a.dataUrl === "string") {
          parts.push({ type: "file", mediaType: a.type, url: a.dataUrl });
        }
      }
      sendMessage({ parts } as unknown as Parameters<typeof sendMessage>[0]);
    } else {
      sendMessage({ text: `${trimmed}${attachmentText}` });
    }
    setInput("");
    setAttachments([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        alert(`Plik ${file.name} jest wiekszy niz 1 MB - MVP wspiera do 1 MB.`);
        continue;
      }
      const dataUrl = await readAsDataUrl(file);
      next.push({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
      });
    }
    setAttachments((prev) => [...prev, ...next]);
  }

  const isStreaming = status === "streaming" || status === "submitted";
  const genProgress = useGenerationProgress(projectId);

  // Forward streaming state up so parents (e.g. ErrorWatcher) can react.
  useEffect(() => {
    onStreamingChange?.(isStreaming);
  }, [isStreaming, onStreamingChange]);

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].id;
    }
    return null;
  }, [messages]);

  const modelDef = getModel(model);

  // ─── Per-message snapshots — populated whenever the assistant finishes a
  //     run. Maps assistantMessageId → snapshotId so we can render a "Cofnij
  //     do tego momentu" button next to each AI reply.
  const [messageSnapshots, setMessageSnapshots] = useState<
    Record<string, string>
  >({});
  const [revertingMessageId, setRevertingMessageId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch(`/api/projects/${projectId}/snapshots`);
        if (!res.ok) return;
        const data = (await res.json()) as Array<{
          id: string;
          message_id: string | null;
        }>;
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const s of data) {
          if (s.message_id) map[s.message_id] = s.id;
        }
        setMessageSnapshots(map);
      } catch {
        /* ignore */
      }
    }
    void refresh();
    return () => {
      cancelled = true;
    };
    // Refetch each time a stream finishes — that's when a new snapshot appears.
  }, [projectId, isStreaming]);

  // ─── "Kontynuuj generowanie" — wznawia przerwany run ───────────────────────
  const continueGeneration = useCallback(() => {
    if (isStreaming) return;
    oneShotModeRef.current = "continue";
    sendMessage({
      text:
        "Zostałeś przerwany w trakcie poprzedniej generacji (timeout / limit kroków). " +
        "Sprawdź listę istniejących plików w systemowym kontekście i dokończ brakujące " +
        "elementy zgodnie z planem. Nie przerabiaj plików, które już są kompletne.",
    });
  }, [isStreaming, sendMessage]);

  // Heurystyka: "byc moze nie skonczone". Pokazujemy CTA gdy:
  //  - mamy juz pliki (cos zostalo zbudowane),
  //  - ostatnia wiadomosc nalezy do AI (nie czekamy na odpowiedz),
  //  - nie streamujemy,
  //  - liczba plikow sugeruje, ze AI wygenerowalo cos sensownego.
  const lastMessage = messages[messages.length - 1];
  const showContinueCta =
    !isStreaming &&
    hasFiles &&
    !!lastMessage &&
    lastMessage.role === "assistant" &&
    mode !== "discuss" &&
    mode !== "plan";

  const handleRevertToMessage = useCallback(
    async (messageId: string) => {
      const snapshotId = messageSnapshots[messageId];
      if (!snapshotId) return;
      const ok = confirm(
        "Cofnąć projekt do stanu sprzed tej odpowiedzi AI? Aktualne pliki zostaną nadpisane.",
      );
      if (!ok) return;
      setRevertingMessageId(messageId);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/snapshots/${snapshotId}/restore`,
          { method: "POST" },
        );
        if (!res.ok) throw new Error("revert failed");
        router.refresh();
      } catch (err) {
        console.error("[revert]", err);
      } finally {
        setRevertingMessageId(null);
      }
    },
    [messageSnapshots, projectId, router],
  );

  return (
    <div className="flex h-full flex-col bg-background">
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <Sparkles className="h-5 w-5 text-beige/70" />
            <p>Opisz co chcesz zbudowac.</p>
          </div>
        )}

        {messages.map((message, idx) => {
          // Snapshots are keyed by the user message that triggered the AI run.
          // Show the "Cofnij" button on the assistant reply right after that
          // user message.
          let triggeringUserId: string | null = null;
          if (message.role === "assistant") {
            for (let j = idx - 1; j >= 0; j--) {
              if (messages[j].role === "user") {
                triggeringUserId = messages[j].id;
                break;
              }
            }
          }
          const snapshotId = triggeringUserId
            ? messageSnapshots[triggeringUserId]
            : undefined;
          return (
          <Message
            key={message.id}
            message={message}
            isStreaming={isStreaming && message.id === lastAssistantId}
            consumedPlans={consumedPlans}
            canRevert={message.role === "assistant" && !!snapshotId}
            isReverting={
              !!triggeringUserId && revertingMessageId === triggeringUserId
            }
            onRevert={() =>
              triggeringUserId && void handleRevertToMessage(triggeringUserId)
            }
            onPlanAction={(partIdx, action, finalSteps) => {
              if (action === "approve") {
                setConsumedPlans((prev) => new Set([...prev, partIdx]));
                // Switch to build mode BEFORE sending so the transport body()
                // reads "build" from modeRef at request time.
                setModeSync("build");
                // Send the final (possibly user-edited) steps as the build instruction
                // so the AI builds exactly what the user approved.
                const stepsText = finalSteps && finalSteps.length > 0
                  ? finalSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")
                  : "";
                const msg = stepsText
                  ? `Zatwierdzone. Oto ostateczny plan do implementacji:\n${stepsText}\n\nRozpocznij implementację.`
                  : "Zatwierdzone. Rozpocznij implementację.";
                sendMessage({ text: msg });
              } else if (action === "skip") {
                setConsumedPlans((prev) => new Set([...prev, partIdx]));
                setModeSync("build");
                sendMessage({ text: "Pomiń plan, implementuj bezpośrednio." });
              }
            }}
          />
          );
        })}

        {isStreaming && (
          <div className="flex flex-col gap-1 rounded-lg border border-beige/10 bg-card/40 px-3 py-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin text-beige/60" />
              <span>
                {genProgress?.currentAction
                  ? genProgress.currentAction
                  : "Mysle..."}
              </span>
            </div>
            {genProgress && genProgress.step > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-beige/10">
                  <div
                    className="h-1 rounded-full bg-beige/50 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((genProgress.step / 20) * 100))}%`,
                    }}
                  />
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground/60">
                  {genProgress.filesWritten.length + genProgress.filesPatched.length} plik
                  {genProgress.filesWritten.length + genProgress.filesPatched.length !== 1 ? "ów" : ""}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Token cost summary — shown briefly after a job completes. */}
        {!isStreaming &&
          genProgress &&
          (genProgress.status === "completed" ||
            genProgress.status === "failed") &&
          genProgress.totalTokens != null && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-muted-foreground/70">
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-beige/50" />
                {formatNumber(genProgress.totalTokens)} tokenów
              </span>
              {genProgress.inputTokens != null &&
                genProgress.outputTokens != null && (
                  <span>
                    {formatNumber(genProgress.inputTokens)} in /{" "}
                    {formatNumber(genProgress.outputTokens)} out
                  </span>
                )}
              {genProgress.pointsSpent != null && (
                <span>· {genProgress.pointsSpent} pkt</span>
              )}
            </div>
          )}

        {showContinueCta && (
          <button
            type="button"
            onClick={continueGeneration}
            className="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-beige/15 bg-beige/5 px-3 py-2 text-left text-xs text-beige/90 transition hover:border-beige/30 hover:bg-beige/10"
            aria-label="Kontynuuj generowanie"
          >
            <span className="flex items-center gap-2">
              <RotateCcw className="h-3.5 w-3.5 text-beige/70 group-hover:text-beige" />
              <span className="font-medium text-foreground">Kontynuuj generowanie</span>
              <span className="text-muted-foreground">— dokończ brakujące pliki</span>
            </span>
            <ArrowUp className="h-3.5 w-3.5 rotate-45 text-muted-foreground group-hover:text-beige" />
          </button>
        )}

        {error && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {error.message.includes("Insufficient points") ||
            error.message.includes("402") ? (
              <>
                <span className="font-medium">Za mało punktów.</span>{" "}
                <a
                  href="/pricing"
                  className="underline hover:text-amber-100"
                  target="_blank"
                  rel="noopener"
                >
                  Uzupełnij punkty
                </a>{" "}
                lub wybierz tańszy model (Haiku 4.5 kosztuje 10 pkt).
              </>
            ) : (
              error.message
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-beige/10 bg-card/40 p-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.json"
          className="hidden"
          onChange={(event) => {
            void handleFiles(event.target.files);
          }}
        />

        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((att) => (
              <span
                key={att.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-beige/20 bg-background px-2 py-1 text-[11px] text-foreground"
              >
                {att.dataUrl?.startsWith("data:image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={att.dataUrl}
                    alt=""
                    className="h-4 w-4 rounded-sm object-cover"
                  />
                ) : (
                  <Paperclip className="h-3 w-3 text-beige/70" />
                )}
                <span className="max-w-[140px] truncate">{att.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) =>
                      prev.filter((item) => item.id !== att.id),
                    )
                  }
                  className="cursor-pointer text-muted-foreground hover:text-beige"
                  aria-label={`Usun ${att.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-beige/20 bg-card transition focus-within:border-beige/50">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={
              mode === "plan"
                ? "Opisz pomysl — asystent przygotuje plan..."
                : mode === "discuss"
                  ? "Zapytaj o kod, architekturę, sugestie..."
                  : "Co dodać lub zmienić?"
            }
            rows={1}
            className="block max-h-32 min-h-[36px] w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            disabled={isStreaming}
          />

          <div className="flex flex-wrap items-center gap-1 px-2 pb-2">
            {/* Przycisk załącznika (zastępuje PlusMenu) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Załącz plik"
              className="flex h-7 cursor-pointer items-center justify-center rounded-md border border-beige/15 bg-background/40 px-1.5 text-muted-foreground transition hover:border-beige/30 hover:bg-white/5 hover:text-beige"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>

            <VoiceButton
              onTranscript={(text) => {
                setInput((prev) => (prev ? `${prev} ${text}` : text));
              }}
            />

            <ModelSelector
              value={model}
              onChange={setModel}
              currentLabel={modelDef.labelShort}
            />

            <SelectModeButton
              active={selectMode}
              onToggle={() => onSelectModeChange(!selectMode)}
            />

            <ModeButton mode={mode} onChange={setModeSync} />

            <div className="ml-auto">
              {isStreaming ? (
                <Button
                  type="button"
                  size="icon-sm"
                  onClick={() => stop()}
                  className="bg-beige/20 text-beige hover:bg-beige/30"
                  aria-label="Zatrzymaj"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon-sm"
                  disabled={!input.trim() && attachments.length === 0}
                  className="bg-beige text-beige-foreground hover:bg-beige/90 disabled:opacity-40"
                  aria-label="Wyslij"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
});

function ModelSelector({
  value,
  onChange,
  currentLabel,
}: {
  value: AiModelId;
  onChange: (id: AiModelId) => void;
  currentLabel: string;
}) {
  const badgeLabel: Record<string, string> = {
    new: "Nowy",
    fast: "Szybki",
    powerful: "Mocny",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-7 max-w-[180px] cursor-pointer items-center gap-1 rounded-md border border-beige/15 bg-background/40 px-2 text-[11px] text-foreground/85 transition hover:border-beige/30 hover:bg-white/5"
        aria-label="Wybierz model"
      >
        <Sparkles className="h-3 w-3 text-beige/70" />
        <span className="truncate">{currentLabel}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1 text-xs uppercase tracking-wider text-muted-foreground">
            Anthropic Claude
          </DropdownMenuLabel>
          {AI_MODELS.map((m) => (
            <DropdownMenuItem
              key={m.id}
              disabled={!m.available}
              onClick={() => m.available && onChange(m.id)}
              className={
                value === m.id
                  ? "flex-col items-start bg-beige/10 text-beige"
                  : "flex-col items-start"
              }
            >
              <div className="flex w-full items-center gap-2">
                <span className="font-medium">{m.label}</span>
                {m.badge && (
                  <span className="ml-auto rounded-full border border-beige/25 px-1.5 py-0 text-[9px] uppercase tracking-wider text-beige/80">
                    {badgeLabel[m.badge] ?? m.badge}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {m.description}
              </p>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SelectModeButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`flex h-7 cursor-pointer items-center gap-1 rounded-md border px-2 text-[11px] transition ${
        active
          ? "border-beige/40 bg-beige/10 text-beige"
          : "border-beige/15 bg-background/40 text-muted-foreground hover:border-beige/30 hover:text-foreground"
      }`}
      title="Tryb wyboru elementu w podgladzie"
    >
      <MousePointer2 className="h-3 w-3" />
      Wybierz
    </button>
  );
}

const MODE_META: Record<
  ChatMode,
  { label: string; icon: typeof Rocket; description: string }
> = {
  build: {
    label: "Build",
    icon: Rocket,
    description: "Generuj i edytuj kod od razu",
  },
  plan: {
    label: "Plan",
    icon: Wrench,
    description: "Pokaż plan, zatwierdź zanim zacznie pisać",
  },
  discuss: {
    label: "Discuss",
    icon: MessagesSquare,
    description: "Porozmawiaj o kodzie, bez zmian (tańszy tryb)",
  },
};

function ModeButton({
  mode,
  onChange,
}: {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
}) {
  const Icon = MODE_META[mode].icon;
  const isActive = mode !== "build";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`flex h-7 cursor-pointer items-center gap-1 rounded-md border px-2 text-[11px] transition ${
          isActive
            ? "border-beige/40 bg-beige/10 text-beige"
            : "border-beige/15 bg-background/40 text-muted-foreground hover:border-beige/30 hover:text-foreground"
        }`}
        title={MODE_META[mode].description}
        aria-label="Wybierz tryb"
      >
        <Icon className="h-3 w-3" />
        {MODE_META[mode].label}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1 text-xs uppercase tracking-wider text-muted-foreground">
            Tryb pracy
          </DropdownMenuLabel>
          {(Object.keys(MODE_META) as ChatMode[]).map((m) => {
            const meta = MODE_META[m];
            const ItemIcon = meta.icon;
            return (
              <DropdownMenuItem
                key={m}
                onClick={() => onChange(m)}
                className={
                  m === mode
                    ? "flex-col items-start bg-beige/10 text-beige"
                    : "flex-col items-start"
                }
              >
                <div className="flex w-full items-center gap-2">
                  <ItemIcon className="h-3.5 w-3.5" />
                  <span className="font-medium">{meta.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {meta.description}
                </p>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ToolPart = {
  type: string;
  state?: string;
  input?: {
    path?: string;
    steps?: string[];
    edits?: Array<{ oldString: string; newString: string }>;
  };
  output?: {
    steps?: string[];
    skipped?: boolean;
    ok?: boolean;
    path?: string;
    content?: string;
    editsApplied?: number;
    error?: string;
  };
};

function Message({
  message,
  isStreaming,
  consumedPlans,
  canRevert,
  isReverting,
  onRevert,
  onPlanAction,
}: {
  message: UIMessage;
  isStreaming: boolean;
  consumedPlans: Set<number>;
  canRevert: boolean;
  isReverting: boolean;
  onRevert: () => void;
  onPlanAction: (partIdx: number, action: "approve" | "skip", finalSteps?: string[]) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
    >
      <div className="flex w-full items-center gap-2 px-1">
        <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
          {isUser ? "Ty" : "Asystent"}
        </span>
        {canRevert && !isStreaming && (
          <button
            type="button"
            onClick={onRevert}
            disabled={isReverting}
            className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-md border border-beige/15 bg-card/40 px-1.5 py-0.5 text-[10px] text-muted-foreground transition hover:border-beige/30 hover:bg-card hover:text-beige disabled:opacity-60"
            title="Cofnij projekt do stanu sprzed tej odpowiedzi"
          >
            {isReverting ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <RotateCcw className="h-2.5 w-2.5" />
            )}
            Cofnij do tego momentu
          </button>
        )}
      </div>
      <div
        className={`max-w-[92%] rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-beige px-3.5 py-2.5 text-beige-foreground"
            : "border border-beige/15 bg-card px-3.5 py-2.5 text-foreground"
        }`}
      >
        {message.parts.map((part, idx) => {
          if (part.type === "text") {
            return (
              <p key={idx} className="whitespace-pre-wrap break-words">
                {part.text}
              </p>
            );
          }
          if (part.type === "reasoning") {
            return null;
          }
          if (part.type === "tool-showPlan") {
            const toolPart = part as ToolPart;
            const steps =
              toolPart.output?.steps ?? toolPart.input?.steps ?? [];
            const isPending =
              toolPart.state === "input-streaming" ||
              toolPart.state === "input-available";
            if (isPending && isStreaming) {
              return (
                <PlanBlock key={idx} steps={steps} isPending={true} />
              );
            }
            // Show interactive PlanCard when streaming is done
            return (
              <PlanCard
                key={idx}
                steps={steps}
                consumed={consumedPlans.has(idx)}
                onApprove={(finalSteps) => onPlanAction(idx, "approve", finalSteps)}
                onSkip={() => onPlanAction(idx, "skip")}
              />
            );
          }
          if (part.type.startsWith("tool-")) {
            const toolPart = part as ToolPart;
            // Hide skipped writes (plan-mode AI tried to write but was blocked)
            if (toolPart.output?.skipped) return null;
            // readFile is a technical detail — hide from chat UI
            if (part.type === "tool-readFile") return null;

            const filePath = toolPart.input?.path ?? toolPart.output?.path;
            const isStreaming = toolPart.state === "input-streaming";

            let verb = part.type.replace("tool-", "");
            if (part.type === "tool-writeFile") verb = "wpisuje";
            else if (part.type === "tool-deleteFile") verb = "usuwa";
            else if (part.type === "tool-patchFile") verb = "edytuje";
            else if (part.type === "tool-fetchImage") verb = "pobiera zdjęcie";

            // For patchFile show how many edits were applied
            const editsSuffix =
              part.type === "tool-patchFile" && toolPart.output?.editsApplied != null
                ? ` (${toolPart.output.editsApplied} ${toolPart.output.editsApplied === 1 ? "zmiana" : "zmian"})`
                : "";

            // Show patch errors inline
            const patchError =
              part.type === "tool-patchFile" && toolPart.output?.ok === false
                ? toolPart.output.error
                : null;

            return (
              <div
                key={idx}
                className="mt-1 flex flex-col gap-0.5 rounded-md bg-background/60 px-2 py-1.5 text-xs text-muted-foreground"
              >
                <div className="flex items-center gap-2">
                  <Wrench className="h-3 w-3 shrink-0 text-beige/70" />
                  <span className="font-mono">
                    {verb}
                    {filePath ? `: ${filePath}` : ""}
                    {editsSuffix}
                  </span>
                  {isStreaming && <Loader2 className="h-3 w-3 animate-spin" />}
                </div>
                {patchError && (
                  <p className="pl-5 text-[10px] text-amber-400/80">{patchError}</p>
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

function PlanBlock({
  steps,
  isPending,
}: {
  steps: string[];
  isPending: boolean;
}) {
  if (!steps.length) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-background/60 px-2 py-1.5 text-xs text-muted-foreground">
        <ListTodo className="h-3 w-3 text-beige/70" />
        Tworze plan...
      </div>
    );
  }

  return (
    <div className="mt-2 first:mt-0 rounded-lg border border-beige/15 bg-background/60 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-beige/80">
        <ListTodo className="h-3.5 w-3.5" />
        Plan
      </div>
      <ul className="space-y-1.5">
        {steps.map((step, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 text-sm text-foreground/90"
          >
            {isPending ? (
              <span className="mt-1 inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-beige/30" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-beige/80" />
            )}
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
