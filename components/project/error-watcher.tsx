"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Sparkles, X } from "lucide-react";

type IframeError = {
  kind: "error" | "rejection" | "console";
  message: string;
  stack?: string | null;
  filename?: string;
  lineno?: number;
};

type Props = {
  /** Wywolane gdy uzytkownik klikie 'Napraw przez AI' — dostarczamy hint gotowy do chatu. */
  onFixRequest: (hint: string) => void;
};

/**
 * Faza 3.7: AI debugger.
 * Nasluchuje na window.message z iframe (skrypt error-listener) i pokazuje banner.
 * Klik 'Napraw przez AI' wstawia szczegoly bledu do chatu jako hint.
 */
export function ErrorWatcher({ onFixRequest }: Props) {
  const [errors, setErrors] = useState<IframeError[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const data = e.data;
      if (data?.type !== "wybitna:error") return;
      setErrors((prev) => {
        const next = [...prev, data as IframeError];
        return next.slice(-3);
      });
      setDismissed(false);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  if (dismissed || errors.length === 0) return null;
  const latest = errors[errors.length - 1];

  function fix() {
    const hint =
      `W podgladzie wystapil blad — napraw go.\n\n` +
      `Typ: ${latest.kind}\n` +
      `Komunikat: ${latest.message}\n` +
      (latest.filename ? `Plik: ${latest.filename}:${latest.lineno}\n` : "") +
      (latest.stack ? `\nStack:\n\`\`\`\n${latest.stack}\n\`\`\`` : "");
    onFixRequest(hint);
    setDismissed(true);
    setErrors([]);
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-4">
      <div className="flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-950/80 p-3 shadow-lg backdrop-blur-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words text-xs font-medium text-rose-100">
            {latest.message}
          </p>
          {errors.length > 1 && (
            <p className="text-[10px] text-rose-300/80">
              +{errors.length - 1} kolejnych błędów
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={fix}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-beige px-2.5 py-1 text-[11px] font-medium text-beige-foreground transition hover:bg-beige/90"
            >
              <Sparkles className="h-3 w-3" />
              Napraw przez AI
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-[11px] text-rose-300/80 hover:text-rose-100"
            >
              Ignoruj
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="cursor-pointer text-rose-300/60 hover:text-rose-100"
          aria-label="Zamknij"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
