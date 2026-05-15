"use client";

/**
 * Bolt-style thinking panel.
 *
 * Default: jeden klikany przycisk "Planuję..." / "Myślałem Xs" z ikoną żarówki.
 * Expanded: lista zdań tokowych z REASONING_PREAMBLE jako ładne kroki.
 *
 * Pokazywany tylko zanim pojawi się pierwszy tool-call (writeFile / showPlan)
 * — później chowamy, bo akcje wyświetla `ActionsTaken`.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Lightbulb, Loader2 } from "lucide-react";
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

/**
 * Split a stream of reasoning text into discrete bullet-points.
 *  - Numbered lists (1. … 2. …) preserved.
 *  - Otherwise split on full-stop boundaries with min length 8 chars.
 */
function splitIntoSteps(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const numberedMatches = trimmed.match(/\d+[.)]\s+[^\n]+/g);
  if (numberedMatches && numberedMatches.length >= 2) {
    return numberedMatches.map((s) => s.replace(/^\d+[.)]\s+/, "").trim());
  }
  return trimmed
    .split(/(?<=[.!?])\s+(?=[A-ZĄĆĘŁŃÓŚŻŹ])/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
}

export function RorkThinkingPanel({ messages, isStreaming }: Props) {
  const firstAssistant = messages.find((m) => m.role === "assistant");
  const textParts = firstAssistant?.parts.filter(isTextPart) ?? [];
  const fullText = textParts.map((t) => t.text).join("\n").trim();
  const steps = splitIntoSteps(fullText);

  const startedAtRef = useRef<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [expanded, setExpanded] = useState(false);

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

  const headerLabel = isStreaming
    ? steps.length === 0
      ? "Planuję..."
      : `Planuję... ${elapsedSec}s`
    : `Myślałem ${elapsedSec}s`;

  return (
    <div className="rounded-lg border border-beige/15 bg-card/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-white/5"
        aria-expanded={expanded}
      >
        {isStreaming ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-beige/80" />
        ) : (
          <Lightbulb className="h-3.5 w-3.5 text-beige/80" />
        )}
        <span className="font-medium text-foreground/90">{headerLabel}</span>
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${
            expanded ? "" : "-rotate-90"
          }`}
        />
      </button>
      {expanded && (
        <div className="border-t border-beige/10 px-3 py-2 text-[12px] leading-relaxed text-foreground/80">
          {steps.length > 0 ? (
            <ol className="space-y-1.5">
              {steps.map((s, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-muted-foreground/70">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          ) : fullText.length > 0 ? (
            <p className="whitespace-pre-wrap">{fullText}</p>
          ) : (
            <span className="text-muted-foreground">
              Analizuję prompt i planuję architekturę...
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pokazujemy thinking panel tylko gdy pierwszy assistant message
 * jeszcze nie ma zadnego tool-callu.
 */
export function shouldShowThinkingPanel(messages: UIMessage[]): boolean {
  const firstAssistant = messages.find((m) => m.role === "assistant");
  if (!firstAssistant) return true;
  const hasToolCall = firstAssistant.parts.some((p) => {
    const t = (p as { type?: string }).type;
    return typeof t === "string" && t.startsWith("tool-");
  });
  return !hasToolCall;
}
