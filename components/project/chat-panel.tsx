"use client";

import {
  forwardRef,
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
  MousePointer2,
  Paperclip,
  Rocket,
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

type ChatMode = "build" | "plan";

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
};

export type ChatPanelHandle = {
  appendHint: (text: string) => void;
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
  },
  ref,
) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("build");
  const [model, setModel] = useState<AiModelId>(DEFAULT_MODEL_ID);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  // Czy mamy zapisane wiadomosci w bazie? Jezeli tak -> nie auto-startujemy generacji.
  const hasStoredHistory = (initialMessages?.length ?? 0) > 0;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/generate",
        body: () => ({
          projectId,
          model,
          mode,
        }),
      }),
    [projectId, model, mode],
  );

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
  useEffect(() => {
    if (
      !startedRef.current &&
      initialPrompt &&
      !hasFiles &&
      !hasStoredHistory &&
      status === "ready" &&
      messages.length === 0
    ) {
      startedRef.current = true;
      sendMessage({ text: initialPrompt });
    }
  }, [
    initialPrompt,
    hasFiles,
    hasStoredHistory,
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

  // Faza 1.3: streaming partial code do edytora i WebContainera.
  // Gdy AI sciaga `tool-writeFile` z `state=input-streaming`, emitujemy
  // event globalny z czesciowa zawartoscia. Sandpack/WC nasluchuja i renderuja
  // typewriter effect w edytorze.
  useEffect(() => {
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      for (const part of m.parts) {
        type StreamingPart = {
          type: string;
          state?: string;
          input?: { path?: string; content?: string };
        };
        const sp = part as StreamingPart;
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
      }
    }
  }, [messages]);

  useImperativeHandle(
    ref,
    () => ({
      appendHint: (text: string) => {
        setInput((prev) => (prev ? `${prev}\n${text}` : text));
      },
    }),
    [],
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
  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].id;
    }
    return null;
  }, [messages]);

  const modelDef = getModel(model);

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

        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            isStreaming={isStreaming && message.id === lastAssistantId}
          />
        ))}

        {isStreaming && (
          <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Mysle...
          </div>
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
                ? "Opisz pomysl - asystent przygotuje plan..."
                : "Co dodac lub zmienic?"
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

            <ModeButton mode={mode} onChange={setMode} />

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

function ModeButton({
  mode,
  onChange,
}: {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(mode === "plan" ? "build" : "plan")}
      aria-pressed={mode === "plan"}
      className={`flex h-7 cursor-pointer items-center gap-1 rounded-md border px-2 text-[11px] transition ${
        mode === "plan"
          ? "border-beige/40 bg-beige/10 text-beige"
          : "border-beige/15 bg-background/40 text-muted-foreground hover:border-beige/30 hover:text-foreground"
      }`}
      title={mode === "plan" ? "Tryb Plan" : "Tryb Build"}
    >
      {mode === "plan" ? (
        <Wrench className="h-3 w-3" />
      ) : (
        <Rocket className="h-3 w-3" />
      )}
      {mode === "plan" ? "Plan" : "Build"}
    </button>
  );
}

type ToolPart = {
  type: string;
  state?: string;
  input?: { path?: string; steps?: string[] };
  output?: { steps?: string[] };
};

function Message({
  message,
  isStreaming,
}: {
  message: UIMessage;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
    >
      <span className="px-1 text-xs uppercase tracking-wider text-muted-foreground/70">
        {isUser ? "Ty" : "Asystent"}
      </span>
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
            return (
              <PlanBlock
                key={idx}
                steps={steps}
                isPending={isPending && isStreaming}
              />
            );
          }
          if (part.type.startsWith("tool-")) {
            const toolPart = part as ToolPart;
            const action = part.type.replace("tool-", "");
            const filePath = toolPart.input?.path;
            return (
              <div
                key={idx}
                className="mt-1 flex items-center gap-2 rounded-md bg-background/60 px-2 py-1.5 text-xs text-muted-foreground"
              >
                <Wrench className="h-3 w-3 text-beige/70" />
                <span className="font-mono">
                  {action === "writeFile"
                    ? "wpisuje"
                    : action === "deleteFile"
                      ? "usuwa"
                      : action}
                  {filePath ? `: ${filePath}` : ""}
                </span>
                {toolPart.state === "input-streaming" && (
                  <Loader2 className="h-3 w-3 animate-spin" />
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

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
