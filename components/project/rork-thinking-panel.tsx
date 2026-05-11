"use client";

/**
 * Rork-style thinking panel.
 *
 * Wyswietlany NA POCZATKU pierwszej generacji nowego projektu — pokazuje
 * uzytkownikowi tok rozumowania agenta (REASONING_PREAMBLE z lib/ai-prompts.ts)
 * zanim AI zacznie pisac pliki.
 *
 * Logika widocznosci (sterowana przez `chat-panel.tsx`):
 *   - widoczny gdy: pierwsza generacja, status === "streaming",
 *                   pierwszy assistant message jeszcze nie ma tool-callu.
 *   - chowany po: pojawieniu sie pierwszego tool-writeFile / tool-showPlan.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import type { UIMessage } from "ai";

type Props = {
  /** Wszystkie wiadomosci w czacie — uzywamy do wyciagniecia text-partow asystenta. */
  messages: UIMessage[];
  /** Czy stream w toku — steruje animacja "Working...". */
  isStreaming: boolean;
};

type TextPart = { type: "text"; text: string };

function isTextPart(p: unknown): p is TextPart {
  return (
    typeof p === "object" &&
    p !== null &&
    (p as { type?: unknown }).type === "text" &&
    typeof (p as { text?: unknown }).text === "string"
  );
}

export function RorkThinkingPanel({ messages, isStreaming }: Props) {
  // Pierwsza assistant-message — to ona zawiera reasoning.
  const firstAssistant = messages.find((m) => m.role === "assistant");
  const textParts = firstAssistant?.parts.filter(isTextPart) ?? [];
  const fullText = textParts.map((t) => t.text).join("\n").trim();

  const startedAtRef = useRef<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [expanded, setExpanded] = useState(true);

  // Start timer when streaming begins.
  useEffect(() => {
    if (!isStreaming) return;
    if (startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }
    const interval = setInterval(() => {
      if (startedAtRef.current !== null) {
        setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isStreaming]);

  // Auto-collapse after streaming ends (so it doesn't dominate the chat after).
  useEffect(() => {
    if (!isStreaming && startedAtRef.current !== null) {
      const t = setTimeout(() => setExpanded(false), 800);
      return () => clearTimeout(t);
    }
  }, [isStreaming]);

  return (
    <div className="mb-3 rounded-2xl border border-beige/20 bg-card/60 p-4 backdrop-blur">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-beige/15">
          <Sparkles className="h-3 w-3 text-beige" />
          {isStreaming && (
            <span className="absolute inset-0 rounded-full border border-beige/40 animate-ping" />
          )}
        </div>
        <span className="text-xs font-medium text-foreground">AI</span>
        {isStreaming ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-beige" />
            Pracuje...
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">Tok rozumowania</span>
        )}
      </div>

      {/* Thought-for-Xs expander */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 inline-flex w-full cursor-pointer items-center justify-between rounded-md border border-beige/10 bg-background/30 px-2.5 py-1.5 text-[11px] text-muted-foreground transition hover:border-beige/25 hover:text-foreground"
      >
        <span>
          {isStreaming ? "Myslalem juz " : "Myslalem "}
          <span className="text-foreground/90">{elapsedSec}s</span>
        </span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${expanded ? "" : "-rotate-90"}`}
        />
      </button>

      {expanded && (
        <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-beige/10 bg-background/40 px-3 py-2 text-[12px] leading-relaxed text-foreground/85 whitespace-pre-wrap">
          {fullText.length > 0 ? (
            fullText
          ) : (
            <span className="text-muted-foreground">
              Analizuje prompt i planuje architekture...
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Helper — sprawdza czy nadal pokazywac thinking panel.
 *
 * Pokazujemy:
 *  - nie ma jeszcze zadnego tool-callu (writeFile / patchFile / showPlan)
 *    w pierwszej assistant message, ALBO
 *  - juz jest tool-call ale stream sie nie skonczyl jeszcze a panel zostal zainicjowany.
 *
 * Najprosciej: ukrywamy po pierwszym tool-callu w pierwszym assistant message.
 */
export function shouldShowThinkingPanel(messages: UIMessage[]): boolean {
  const firstAssistant = messages.find((m) => m.role === "assistant");
  if (!firstAssistant) return true; // user wyslal, asystent jeszcze nie odpowiedzial
  const hasToolCall = firstAssistant.parts.some((p) => {
    const t = (p as { type?: string }).type;
    return typeof t === "string" && t.startsWith("tool-");
  });
  return !hasToolCall;
}
