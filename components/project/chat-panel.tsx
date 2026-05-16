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
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  HelpCircle,
  Lightbulb,
  ListTodo,
  Loader2,
  MessagesSquare,
  MousePointer2,
  Paperclip,
  Play,
  RotateCcw,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BuyCreditsDialog } from "@/components/app-shell/buy-credits-dialog";
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
import {
  AttachmentMenu,
  getToolIconByAttachmentType,
} from "@/components/project/attachment-menu";
import { PlanCard } from "@/components/project/plan-card";
import { useGenerationProgress } from "@/components/project/use-generation-progress";
import {
  RorkThinkingPanel,
  shouldShowThinkingPanel,
} from "@/components/project/rork-thinking-panel";

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
  /** Notifies the parent when the chat mode toggles (build / plan / discuss). */
  onModeChange?: (mode: ChatMode) => void;
};

export type ChatPanelHandle = {
  appendHint: (text: string) => void;
  /** Sends the hint as a chat message immediately (used by auto-fix). */
  submitHint: (text: string) => void;
  /**
   * Cursor-style: doczepia kontekst wybranego elementu DOM jako "chip" obok
   * pola tekstowego. Tresc jest wstrzykiwana do wiadomosci dopiero w submit().
   */
  attachElement: (info: {
    selector?: string;
    html?: string;
    tagName?: string;
    x?: number;
    y?: number;
  }) => void;
  /**
   * Called by WizardPanel after the user answers questions.
   * Forces PLAN mode so the AI presents the plan before writing any files.
   * The PlanCard "Approve" button then switches to BUILD mode.
   */
  startWithPlanPrompt: (enrichedPrompt: string) => void;
  /** Start with the enriched prompt in the current mode (used when wizard is skipped). */
  startWithPrompt: (enrichedPrompt: string) => void;
};

type ElementAttachment = {
  selector?: string;
  html?: string;
  tagName?: string;
  x?: number;
  y?: number;
};

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB

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
    onModeChange,
  },
  ref,
) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>(initialMode ?? "build");
  const resolvedInitialModel: AiModelId =
    (initialModel as AiModelId | undefined) ?? DEFAULT_MODEL_ID;

  const [model, setModel] = useState<AiModelId>(resolvedInitialModel);

  function handleModelChange(id: AiModelId) {
    setModel(id);
  }
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [buyCreditsOpen, setBuyCreditsOpen] = useState(false);
  // Inline element-attachments (Cursor-style): badge'e wstrzykiwane bezpośrednio
  // do contenteditable. Stan trzymany w DOM; ref do edytora służy do (a) zapisu
  // pozycji karetki przed wstrzyknięciem (b) odczytu treści przy submit.
  const editableRef = useRef<HTMLDivElement>(null);
  const caretRangeRef = useRef<Range | null>(null);
  // Track which plan cards have been acted on (approved/skipped)
  const [consumedPlans, setConsumedPlans] = useState<Set<number>>(new Set());
  // Pending approval: index of the plan part awaiting AI response.
  // While set, the Approve button shows a spinner and is disabled.
  // Cleared on AI finish or error.
  const [pendingApprovalPartIdx, setPendingApprovalPartIdx] = useState<number | null>(null);
  const pendingApprovalPartIdxRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  // Ref-based mode: body() reads modeRef.current at request time, avoiding
  // the stale-closure problem when the Approve button switches plan→build.
  const modeRef = useRef<ChatMode>(initialMode ?? "build");
  function setModeSync(newMode: ChatMode) {
    modeRef.current = newMode;
    setMode(newMode);
    onModeChange?.(newMode);
  }

  // Notify parent of the initial mode on mount.
  useEffect(() => {
    onModeChange?.(modeRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // Sygnal dla edytora i overlay: AI zakonczylo streaming.
      // Edytor czysci "live z AI" wskaznik, overlay znika.
      window.dispatchEvent(new CustomEvent("wybitna:partial-write-end"));
      // Mark pending plan as consumed now that AI responded successfully.
      if (pendingApprovalPartIdxRef.current !== null) {
        setConsumedPlans((prev) =>
          new Set([...prev, pendingApprovalPartIdxRef.current!]),
        );
        pendingApprovalPartIdxRef.current = null;
        setPendingApprovalPartIdx(null);
      }
      router.refresh();
    },
  });

  // Clear pending approval on error so the user can retry.
  useEffect(() => {
    if (error && pendingApprovalPartIdxRef.current !== null) {
      pendingApprovalPartIdxRef.current = null;
      setPendingApprovalPartIdx(null);
    }
  }, [error]);

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

  // Smart auto-scroll: trzymamy `stickyBottom = true` dopoki uzytkownik jest
  // blisko dolu (< 80px). Gdy odscrolluje wyzej, wylacza sie auto-scroll dla
  // nowych wiadomosci/streamingu — uzytkownik moze spokojnie czytac wczesniejsze
  // partie kodu bez "skakania" do dolu.
  const stickyBottomRef = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      const sticky = distance < 80;
      stickyBottomRef.current = sticky;
      setShowScrollBtn(!sticky);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!stickyBottomRef.current) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    stickyBottomRef.current = true;
    setShowScrollBtn(false);
  }, []);

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

  // Wysłanie postMessage do iframe z preview (bezpieczne — działa również gdy
  // iframe nie istnieje, np. w trybie code-only).
  function sendIframeMessage(payload: unknown) {
    const iframe = document.querySelector(
      "iframe[title='Preview']",
    ) as HTMLIFrameElement | null;
    iframe?.contentWindow?.postMessage(payload, "*");
  }

  // Zapamiętaj pozycję karetki w contenteditable — dzięki temu badge wstrzykiwany
  // przez attachElement trafi w miejsce, gdzie user ostatnio pisał.
  function saveCaret() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (editableRef.current?.contains(range.commonAncestorContainer)) {
      caretRangeRef.current = range.cloneRange();
    }
  }

  function syncInputFromEditable() {
    const el = editableRef.current;
    if (!el) return;
    setInput(el.innerText ?? "");
  }

  function insertElementBadge(info: ElementAttachment) {
    const el = editableRef.current;
    if (!el) return;
    const span = document.createElement("span");
    span.contentEditable = "false";
    span.dataset.elementSelector = info.selector ?? "";
    span.dataset.elementHtml = info.html ?? "";
    span.dataset.elementTag = info.tagName ?? "";
    span.className =
      "inline-flex items-center gap-1 rounded border border-violet-400/30 bg-violet-500/10 px-1.5 py-0.5 text-[11px] text-violet-100 font-mono cursor-default select-none mx-0.5 align-baseline";
    span.textContent = info.tagName ? `<${info.tagName}>` : "<el>";
    if (info.selector) span.title = info.selector;

    span.addEventListener("mouseenter", () => {
      const s = info.selector;
      if (s)
        sendIframeMessage({ type: "wybitna:hover-element", selector: s });
    });
    span.addEventListener("mouseleave", () => {
      sendIframeMessage({ type: "wybitna:hover-element-clear" });
    });

    // Insert at saved caret or append at end.
    const range = caretRangeRef.current;
    let insertion: Range;
    if (range && el.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(span);
      insertion = range;
    } else {
      el.appendChild(span);
      insertion = document.createRange();
      insertion.selectNodeContents(el);
      insertion.collapse(false);
    }
    // Trailing space → łatwiej kontynuować pisanie po badge.
    const trailing = document.createTextNode(" ");
    insertion.setStartAfter(span);
    insertion.collapse(true);
    insertion.insertNode(trailing);
    insertion.setStartAfter(trailing);
    insertion.collapse(true);

    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(insertion);
    caretRangeRef.current = insertion.cloneRange();

    el.focus();
    syncInputFromEditable();
  }

  /**
   * Walk the editable DOM left→right and build the message text:
   *  - text/<br> nodes → plain text
   *  - badge spans     → inline `[Wybrany element <tag> \`selector\`]` + HTML block
   * Zachowuje chronologiczną kolejność tak jak user napisał.
   */
  function composeEditableText(): string {
    const el = editableRef.current;
    if (!el) return input;
    let out = "";
    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        out += node.textContent ?? "";
        return;
      }
      if (!(node instanceof HTMLElement)) return;
      if (node.tagName === "BR") {
        out += "\n";
        return;
      }
      if (node.dataset.elementSelector !== undefined) {
        const tag = node.dataset.elementTag
          ? `<${node.dataset.elementTag}>`
          : "";
        const selStr = node.dataset.elementSelector
          ? `\`${node.dataset.elementSelector}\``
          : "";
        const html = node.dataset.elementHtml
          ? `\n\nAktualny HTML:\n\`\`\`html\n${node.dataset.elementHtml}\n\`\`\``
          : "";
        out += `[Wybrany element ${tag} ${selStr}]${html}`;
        return;
      }
      out += node.textContent ?? "";
    });
    return out;
  }

  function clearEditable() {
    if (editableRef.current) editableRef.current.innerHTML = "";
    caretRangeRef.current = null;
    setInput("");
  }

  useImperativeHandle(
    ref,
    () => ({
      appendHint: (text: string) => {
        const el = editableRef.current;
        if (el) {
          if (el.innerText.trim()) {
            el.appendChild(document.createTextNode(`\n${text}`));
          } else {
            el.appendChild(document.createTextNode(text));
          }
          syncInputFromEditable();
        } else {
          setInput((prev) => (prev ? `${prev}\n${text}` : text));
        }
      },
      attachElement: (info) => {
        insertElementBadge({
          selector: info.selector,
          html: info.html,
          tagName: info.tagName,
          x: info.x,
          y: info.y,
        });
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
    // Composed text łączy plain text z inline-badges (chronologicznie).
    const composed = composeEditableText();
    const trimmed = composed.trim();
    if (!trimmed && attachments.length === 0) return;

    // Faza 3.2: image-to-code. Obrazki wysylamy jako oddzielne parts (Claude Vision).
    const imageAttachments = attachments.filter((a) =>
      a.type.startsWith("image/"),
    );
    const toolAttachments = attachments.filter((a) =>
      a.type.startsWith("wybitna/"),
    );
    const fileAttachments = attachments.filter(
      (a) => !a.type.startsWith("image/") && !a.type.startsWith("wybitna/"),
    );

    const toolText =
      toolAttachments.length > 0
        ? `\n\n[Narzędzia do uwzględnienia: ${toolAttachments
            .map((a) => a.name)
            .join(", ")}]`
        : "";
    const attachmentText =
      fileAttachments.length > 0
        ? `\n\n[Zalaczniki: ${fileAttachments
            .map((a) => `${a.name} (${humanSize(a.size)})`)
            .join(", ")}]`
        : "";

    if (imageAttachments.length > 0) {
      // Multimodalne wiadomosci — text + obrazki (Claude Vision).
      const parts: Array<
        | { type: "text"; text: string }
        | { type: "file"; mediaType: string; url: string }
      > = [
        {
          type: "text",
          text: `${trimmed}${toolText}${attachmentText}`,
        },
      ];
      for (const a of imageAttachments) {
        if (typeof a.dataUrl === "string") {
          parts.push({ type: "file", mediaType: a.type, url: a.dataUrl });
        }
      }
      sendMessage({ parts } as unknown as Parameters<typeof sendMessage>[0]);
    } else {
      sendMessage({
        text: `${trimmed}${toolText}${attachmentText}`,
      });
    }
    clearEditable();
    setAttachments([]);
    // Wyczyść hover overlay w iframe (na wypadek aktywnego pulsu).
    sendIframeMessage({ type: "wybitna:hover-element-clear" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        alert(`Plik ${file.name} jest za duży (max 5 MB).`);
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

  // CTA gdy job się nie domknął (timeout / błąd) albo backend zasygnalizował kontynuację (`is_continue`).
  const showContinueCta =
    !isStreaming &&
    hasFiles &&
    mode !== "discuss" &&
    mode !== "plan" &&
    (genProgress?.status === "stalled" ||
      genProgress?.status === "failed" ||
      genProgress?.isContinue === true);

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
      <div className="relative min-h-0 flex-1">
        {showScrollBtn && (
          <button
            type="button"
            onClick={scrollToBottom}
            aria-label="Przewiń na dół"
            title="Przewiń na dół"
            className="absolute bottom-3 right-4 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-beige/25 bg-card/95 text-foreground shadow-lg shadow-black/30 backdrop-blur transition hover:border-beige/50 hover:bg-card"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        )}
        <div
          ref={scrollRef}
          className="h-full space-y-6 overflow-y-auto px-4 py-4"
        >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <Sparkles className="h-5 w-5 text-beige/70" />
            <p>Opisz co chcesz zbudowac.</p>
          </div>
        )}

        {/* Rork-style thinking panel — pokazywany tylko przy pierwszej generacji
            nowego projektu (brak zapisanej historii) i tylko zanim AI zacznie
            pisac pliki / pokaze plan. */}
        {!hasStoredHistory &&
          messages.length > 0 &&
          shouldShowThinkingPanel(messages) && (
            <RorkThinkingPanel messages={messages} isStreaming={isStreaming} />
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
          const isLastAssistant =
            message.role === "assistant" && message.id === lastAssistantId;
          const showImplementButton =
            isLastAssistant &&
            !isStreaming &&
            mode === "plan" &&
            // Plan-mode reply must have at least one text part (the rationale).
            message.parts.some((p) => p.type === "text") &&
            // And no tool calls (plan mode disables writeFile etc.).
            !message.parts.some(
              (p) =>
                typeof (p as { type?: string }).type === "string" &&
                (p as { type: string }).type.startsWith("tool-") &&
                (p as { type: string }).type !== "tool-showPlan",
            );
          return (
          <Message
            key={message.id}
            message={message}
            isStreaming={isStreaming && message.id === lastAssistantId}
            consumedPlans={consumedPlans}
            pendingApprovalPartIdx={pendingApprovalPartIdx}
            canRevert={message.role === "assistant" && !!snapshotId}
            isReverting={
              !!triggeringUserId && revertingMessageId === triggeringUserId
            }
            onRevert={() =>
              triggeringUserId && void handleRevertToMessage(triggeringUserId)
            }
            showImplementButton={showImplementButton}
            onImplementPlan={() => {
              setModeSync("build");
              sendMessage({ text: "Zaimplementuj plan." });
            }}
            onSubmitQuestionAnswer={(answer) => {
              sendMessage({ text: answer });
            }}
            onPlanAction={(partIdx, action, finalSteps) => {
              if (action === "approve") {
                // Mark as pending — consumed only after AI finishes (onFinish).
                pendingApprovalPartIdxRef.current = partIdx;
                setPendingApprovalPartIdx(partIdx);
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
            error.message.includes("insufficient_credits") ||
            error.message.includes("402") ? (
              <>
                <span className="font-medium">Za malo kredytow.</span>{" "}
                <button
                  type="button"
                  onClick={() => setBuyCreditsOpen(true)}
                  className="cursor-pointer underline hover:text-amber-100"
                >
                  Kup kredyty
                </button>{" "}
                lub wybierz tanszy model (Haiku 4.5 kosztuje 10 kr).
              </>
            ) : (
              error.message
            )}
          </div>
        )}
        <BuyCreditsDialog open={buyCreditsOpen} onClose={() => setBuyCreditsOpen(false)} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-beige/10 bg-card/40 p-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.json,.csv,.svg,.xml,.yaml,.yml,.tsx,.ts,.js,.jsx,.html,.css"
          className="hidden"
          onChange={(event) => {
            void handleFiles(event.target.files);
          }}
        />

        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((att) => {
              const Icon = att.type.startsWith("wybitna/")
                ? getToolIconByAttachmentType(att.type)
                : null;
              return (
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
                  ) : Icon ? (
                    <Icon className="h-3.5 w-3.5 text-beige/80" />
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
              );
            })}
          </div>
        )}

        <div className="rounded-xl border border-beige/10 bg-card/30 transition focus-within:border-beige/40">
          {/* Contenteditable zamiast textarea — pozwala wstrzykiwać inline-badges
              (wybrane elementy podglądu) bezpośrednio w treść wpisywaną przez usera. */}
          <div
            ref={editableRef}
            contentEditable={!isStreaming}
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Treść wiadomości"
            data-placeholder={
              mode === "plan"
                ? "Opisz pomysl — asystent przygotuje plan..."
                : mode === "discuss"
                  ? "Zapytaj o kod, architekturę, sugestie..."
                  : "Co dodać lub zmienić?"
            }
            onInput={syncInputFromEditable}
            onBlur={saveCaret}
            onMouseUp={saveCaret}
            onKeyUp={saveCaret}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                const form = (event.currentTarget as HTMLElement).closest(
                  "form",
                ) as HTMLFormElement | null;
                form?.requestSubmit();
              }
            }}
            onPaste={(event) => {
              // Strip formatting — wkleja czysty tekst.
              event.preventDefault();
              const text = event.clipboardData.getData("text/plain");
              document.execCommand("insertText", false, text);
            }}
            className={`block max-h-32 min-h-[36px] w-full overflow-y-auto bg-transparent px-3 pt-2.5 pb-1 text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words focus:outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] ${
              isStreaming ? "opacity-60" : ""
            }`}
          />

          <div className="flex items-center gap-1 bg-card/30 px-2 pb-2">
            <AttachmentMenu
              onPickFile={() => fileInputRef.current?.click()}
              onPickTool={(tool) => {
                setAttachments((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    name: tool.label,
                    type: `wybitna/${tool.category}:${tool.id}`,
                    size: 0,
                  },
                ]);
              }}
              onOpenStripe={() => {
                window.dispatchEvent(
                  new CustomEvent("wybitna:open-canvas-view", {
                    detail: { view: "stripe" },
                  }),
                );
              }}
            />

            <ModelSelector
              value={model}
              onChange={handleModelChange}
              currentLabel={modelDef.displayName ?? modelDef.labelShort}
            />

            <div className="flex-1" />

            <SelectModeButton
              active={selectMode}
              onToggle={() => onSelectModeChange(!selectMode)}
            />

            <PlanModeButton mode={mode} onChange={setModeSync} />

            {isStreaming ? (
              <Button
                type="button"
                size="icon-sm"
                onClick={() => stop()}
                className="rounded-full bg-beige/20 text-beige hover:bg-beige/30"
                aria-label="Zatrzymaj"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon-sm"
                disabled={!input.trim() && attachments.length === 0}
                className="rounded-full bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-40"
                aria-label="Wyślij"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
            )}
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
        className="flex h-7 max-w-[160px] cursor-pointer items-center gap-1 rounded-md px-2 text-[11px] font-medium text-foreground/80 transition hover:bg-white/5 hover:text-foreground"
        aria-label="Wybierz model"
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1 text-xs uppercase tracking-wider text-muted-foreground">
            Anthropic Claude
          </DropdownMenuLabel>
          {AI_MODELS.map((m) => {
            return (
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
                  {m.badge ? (
                    <span className="ml-auto rounded-full border border-beige/25 px-1.5 py-0 text-[9px] uppercase tracking-wider text-beige/80">
                      {badgeLabel[m.badge] ?? m.badge}
                    </span>
                  ) : null}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {m.description}
                </p>
              </DropdownMenuItem>
            );
          })}
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
      title="Tryb wyboru elementu w podglądzie — kliknij dowolny element strony"
      aria-label="Wybierz element w podglądzie"
      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition ${
        active
          ? "bg-beige/15 text-beige"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
      }`}
    >
      <MousePointer2 className="h-4 w-4" />
    </button>
  );
}

/**
 * Single-button mode toggle: build ↔ plan ↔ discuss.
 * Click cycles forward; when active (non-build) label is highlighted.
 */
function PlanModeButton({
  mode,
  onChange,
}: {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
}) {
  const CYCLE: Record<ChatMode, ChatMode> = {
    build: "plan",
    plan: "discuss",
    discuss: "build",
  };

  const isActive = mode !== "build";

  const label = mode === "discuss" ? "Chat" : "Planuj";
  const Icon = mode === "discuss" ? MessagesSquare : Lightbulb;
  const activeClass =
    mode === "plan"
      ? "bg-amber-400/10 text-amber-300"
      : mode === "discuss"
        ? "bg-blue-400/10 text-blue-300"
        : "text-muted-foreground hover:bg-white/5 hover:text-foreground";

  const titleMap: Record<ChatMode, string> = {
    build: "Przełącz w tryb planowania — AI pokaże plan zanim zacznie pisać kod",
    plan: "Aktywny: Planowanie. Kliknij → Chat (rozmowa bez edycji plików)",
    discuss: "Aktywny: Chat. Kliknij → tryb budowy",
  };

  return (
    <button
      type="button"
      onClick={() => onChange(CYCLE[mode])}
      aria-pressed={isActive}
      title={titleMap[mode]}
      className={`flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[11px] font-medium transition ${activeClass}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

type ToolPart = {
  type: string;
  state?: string;
  input?: {
    path?: string;
    steps?: string[];
    question?: string;
    options?: string[];
    edits?: Array<{ oldString: string; newString: string }>;
  };
  output?: {
    steps?: string[];
    question?: string;
    options?: string[];
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
  pendingApprovalPartIdx,
  canRevert,
  isReverting,
  onRevert,
  onPlanAction,
  showImplementButton,
  onImplementPlan,
  onSubmitQuestionAnswer,
}: {
  message: UIMessage;
  isStreaming: boolean;
  consumedPlans: Set<number>;
  pendingApprovalPartIdx: number | null;
  canRevert: boolean;
  isReverting: boolean;
  onRevert: () => void;
  onPlanAction: (partIdx: number, action: "approve" | "skip", finalSteps?: string[]) => void;
  showImplementButton: boolean;
  onImplementPlan: () => void;
  onSubmitQuestionAnswer: (answer: string) => void;
}) {
  const isUser = message.role === "user";

  // Bolt-clean flat layout:
  //   user  → small rounded chip aligned right
  //   AI    → full-width, no bubble, just text + tool rows
  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="ml-auto max-w-[80%] rounded-2xl bg-white/5 px-3.5 py-2 text-sm leading-relaxed text-foreground/95">
          {message.parts.map((part, idx) => {
            if (part.type === "text") {
              return (
                <p key={idx} className="whitespace-pre-wrap break-words">
                  {part.text}
                </p>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[11px] font-medium text-foreground/80">
        <span className="inline-flex h-4 w-4 items-center justify-center">
          <Sparkles className="h-3 w-3 text-beige/80" />
        </span>
        <span>Wybitny programista</span>
        <div className="ml-auto flex items-center gap-1">
          {canRevert && !isStreaming && (
            <button
              type="button"
              onClick={onRevert}
              disabled={isReverting}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 transition hover:bg-white/5 hover:text-beige group-hover:opacity-100 disabled:opacity-60"
              title="Cofnij projekt do stanu sprzed tej odpowiedzi"
            >
              {isReverting ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              ) : (
                <RotateCcw className="h-2.5 w-2.5" />
              )}
              Cofnij
            </button>
          )}
        </div>
      </div>
      <div className="w-full space-y-3 text-sm leading-relaxed text-foreground/95">
        {message.parts.map((part, idx) => {
          if (part.type === "text") {
            return (
              <div
                key={idx}
                className="whitespace-pre-wrap break-words text-foreground/90"
              >
                {part.text}
              </div>
            );
          }
          if (part.type === "reasoning") {
            return null;
          }
          if (part.type === "tool-showQuestions") {
            const tp = part as ToolPart;
            const q = tp.output?.question ?? tp.input?.question ?? "";
            const opts = tp.output?.options ?? tp.input?.options ?? [];
            return (
              <QuestionCard
                key={idx}
                question={q}
                options={opts}
                onSubmit={onSubmitQuestionAnswer}
              />
            );
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
                approvalPending={pendingApprovalPartIdx === idx}
                onApprove={(finalSteps) => onPlanAction(idx, "approve", finalSteps)}
                onSkip={() => onPlanAction(idx, "skip")}
              />
            );
          }
          return null;
        })}

        {(() => {
          // Collect tool actions (writeFile/patchFile/deleteFile/generateImage/fetchImage)
          // into a single collapsible "actions taken" group — Bolt-style.
          const actions: Array<{
            verb: string;
            path?: string;
            editsApplied?: number;
            error?: string | null;
            isStreaming: boolean;
          }> = [];
          for (const part of message.parts) {
            if (!part.type.startsWith("tool-")) continue;
            if (part.type === "tool-readFile") continue;
            if (part.type === "tool-showPlan") continue;
            if (part.type === "tool-showQuestions") continue;
            const tp = part as ToolPart;
            if (tp.output?.skipped) continue;
            let verb = part.type.replace("tool-", "");
            if (part.type === "tool-writeFile") verb = "Utworzono";
            else if (part.type === "tool-deleteFile") verb = "Usunięto";
            else if (part.type === "tool-patchFile") verb = "Edytowano";
            else if (part.type === "tool-fetchImage") verb = "Pobrano zdjęcie";
            else if (part.type === "tool-generateImage") verb = "Wygenerowano obraz";
            actions.push({
              verb,
              path: tp.input?.path ?? tp.output?.path,
              editsApplied:
                part.type === "tool-patchFile"
                  ? (tp.output?.editsApplied as number | undefined)
                  : undefined,
              error:
                part.type === "tool-patchFile" && tp.output?.ok === false
                  ? tp.output.error ?? null
                  : null,
              isStreaming: tp.state === "input-streaming",
            });
          }
          if (actions.length === 0) return null;
          return <ActionsTaken key="actions" actions={actions} />;
        })()}
        {showImplementButton && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onImplementPlan}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-beige/40 bg-beige px-4 text-sm font-medium text-beige-foreground transition hover:bg-beige/90"
            >
              <Play className="h-3.5 w-3.5" />
              Zaimplementuj
            </button>
          </div>
        )}
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

function ActionsTaken({
  actions,
}: {
  actions: Array<{
    verb: string;
    path?: string;
    editsApplied?: number;
    error?: string | null;
    isStreaming: boolean;
  }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const anyStreaming = actions.some((a) => a.isStreaming);
  return (
    <div className="rounded-lg border border-beige/15 bg-card/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs text-foreground/85 transition hover:bg-white/5"
        aria-expanded={expanded}
      >
        {anyStreaming ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-beige/70" />
        ) : (
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-beige/40">
            <CheckCircle2 className="h-2.5 w-2.5 text-beige/80" />
          </span>
        )}
        <span className="font-medium">
          {actions.length} {actions.length === 1 ? "akcja" : "akcji"}
        </span>
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "" : "-rotate-90"}`}
        />
      </button>
      {expanded && (
        <div className="space-y-1 border-t border-beige/10 px-3 py-2">
          {actions.map((a, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-[11px] text-muted-foreground"
            >
              {a.isStreaming ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin text-beige/60" />
              ) : (
                <Wrench className="h-3 w-3 shrink-0 text-beige/60" />
              )}
              <span className="text-foreground/85">{a.verb}</span>
              {a.path && (
                <span className="truncate font-mono text-muted-foreground/80">
                  {a.path}
                </span>
              )}
              {a.editsApplied != null && (
                <span className="text-muted-foreground/70">
                  · {a.editsApplied} {a.editsApplied === 1 ? "zmiana" : "zmian"}
                </span>
              )}
              {a.error && (
                <span className="ml-auto text-amber-400/80">{a.error}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  options,
  onSubmit,
}: {
  question: string;
  options: string[];
  onSubmit: (answer: string) => void;
}) {
  const [custom, setCustom] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function pick(value: string) {
    if (submitted || !value.trim()) return;
    setSubmitted(true);
    onSubmit(value);
  }

  return (
    <div className="rounded-xl border border-beige/15 bg-card/30 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-beige/85">
        <HelpCircle className="h-3.5 w-3.5" />
        Pytanie
      </div>
      <p className="mb-3 text-sm text-foreground/95">{question}</p>
      {options.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              disabled={submitted}
              onClick={() => pick(opt)}
              className="cursor-pointer rounded-lg border border-beige/20 bg-background/60 px-3 py-1.5 text-xs text-foreground/90 transition hover:border-beige/45 hover:bg-beige/10 hover:text-beige disabled:cursor-not-allowed disabled:opacity-50"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          pick(custom);
        }}
        className="mt-2 flex items-center gap-2"
      >
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          disabled={submitted}
          placeholder="Wpisz własną odpowiedź..."
          className="flex-1 rounded-md border border-beige/15 bg-background/40 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-beige/40 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={submitted || !custom.trim()}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-beige text-beige-foreground transition hover:bg-beige/90 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Wyślij odpowiedź"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </form>
      {submitted && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Wysłano odpowiedź.
        </p>
      )}
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
