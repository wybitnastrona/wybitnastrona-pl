"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Sparkles, X } from "lucide-react";

type IframeError = {
  kind: "error" | "rejection" | "console";
  message: string;
  stack?: string | null;
  filename?: string;
  lineno?: number;
};

type Props = {
  /** Called when the user (or auto-fix) wants to dispatch a fix request. */
  onFixRequest: (hint: string, opts: { auto: boolean }) => void;
  /** True while a generation is in flight — auto-fix waits for completion. */
  isStreaming: boolean;
};

const AUTO_FIX_KEY = "wybitna:auto-fix";
const AUTO_FIX_COUNTDOWN_MS = 4000;
const MAX_AUTO_FIX_ATTEMPTS = 3;

/**
 * Watches preview-iframe errors. Surfaces them in a banner with two paths:
 *  1) Manual: user clicks "Napraw przez AI" → dispatches a chat message.
 *  2) Auto-fix toggle: when enabled, the watcher waits a few seconds (so the
 *     user can cancel) and then automatically dispatches the fix request.
 *
 * Safety rails:
 *  - De-duplicates by message+filename+lineno so the same error doesn't fire
 *    twice in a row.
 *  - After {MAX_AUTO_FIX_ATTEMPTS} consecutive auto-fixes the loop stops and
 *    asks the user to intervene (avoids runaway costs / infinite loops).
 *  - Auto-fix never triggers while a generation is already streaming.
 */
export function ErrorWatcher({ onFixRequest, isStreaming }: Props) {
  const [errors, setErrors] = useState<IframeError[]>([]);
  const [dismissed, setDismissed] = useState(false);
  // Lazy-init from localStorage so we don't trigger an extra render via
  // setState-in-effect. SSR returns false; client reads the actual value on
  // the first commit.
  const [autoFix, setAutoFix] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(AUTO_FIX_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  const [autoAttempts, setAutoAttempts] = useState(0);
  // Tracks the last error we've already fired a fix for. Lives as state
  // (not ref) because we read it during render to compute `shouldArm`.
  const [lastFiredKey, setLastFiredKey] = useState<string | null>(null);
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function persistAutoFix(next: boolean) {
    setAutoFix(next);
    try {
      window.localStorage.setItem(AUTO_FIX_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  // isStreaming jako ref dla synchronizacji wewnatrz handler-a postMessage
  // (uniknij synchronicznego setState w effect ze wzgledu na react-hooks rules).
  const isStreamingRef = useRef(isStreaming);
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Listen for errors posted by the preview iframe.
  // Podczas streamu AI pisze pliki czesciowo i Vite zglasza tranzytowe HMR 500
  // przy kazdym chunkcie. Tlumimy te bledy az do `isStreaming=false` — pelny
  // banner pokazujemy tylko gdy AI skonczy generacje.
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const data = e.data;
      if (data?.type !== "wybitna:error") return;
      if (isStreamingRef.current) return; // pomijamy bledy z czasu streamu
      setErrors((prev) => {
        const next = [...prev, data as IframeError];
        return next.slice(-3);
      });
      setDismissed(false);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const latest = errors[errors.length - 1];

  const fire = useCallback(
    (err: IframeError, opts: { auto: boolean }) => {
      const hint =
        `W podgladzie wystapil blad — napraw go.\n\n` +
        `Typ: ${err.kind}\n` +
        `Komunikat: ${err.message}\n` +
        (err.filename ? `Plik: ${err.filename}:${err.lineno}\n` : "") +
        (err.stack ? `\nStack:\n\`\`\`\n${err.stack}\n\`\`\`` : "");
      onFixRequest(hint, opts);
      setLastFiredKey(errKey(err));
      setDismissed(true);
      setErrors([]);
      setAutoCountdown(null);
    },
    [onFixRequest],
  );

  // Whether the auto-fix loop should be armed for the *current* latest error.
  // Pure derivation from props/state keeps the side-effect below minimal.
  const shouldArm =
    autoFix &&
    !!latest &&
    !dismissed &&
    !isStreaming &&
    autoAttempts < MAX_AUTO_FIX_ATTEMPTS &&
    lastFiredKey !== (latest ? errKey(latest) : null);

  // Auto-fix scheduler — runs only while armed. Cleanup clears the state, so
  // we don't have to call setState in the effect body's early-return paths.
  useEffect(() => {
    if (!shouldArm || !latest) return;

    const start = Date.now();
    const initial = Math.ceil(AUTO_FIX_COUNTDOWN_MS / 1000);
    // Initial countdown render — triggers one extra render but is required
    // so the user sees "Naprawiam za Ns" before the first interval tick.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoCountdown(initial);
    const tick = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((AUTO_FIX_COUNTDOWN_MS - (Date.now() - start)) / 1000),
      );
      setAutoCountdown(remaining);
    }, 250);
    cancelTimerRef.current = setTimeout(() => {
      clearInterval(tick);
      setAutoAttempts((n) => n + 1);
      fire(latest, { auto: true });
    }, AUTO_FIX_COUNTDOWN_MS);

    return () => {
      clearInterval(tick);
      if (cancelTimerRef.current) {
        clearTimeout(cancelTimerRef.current);
        cancelTimerRef.current = null;
      }
      setAutoCountdown(null);
    };
  }, [shouldArm, latest, fire]);

  // When generation finishes successfully (no new error within 5s), reset the
  // attempt counter — fresh starting point for a new auto-fix sequence.
  useEffect(() => {
    if (isStreaming) return;
    const id = setTimeout(() => {
      if (errors.length === 0) setAutoAttempts(0);
    }, 5000);
    return () => clearTimeout(id);
  }, [isStreaming, errors.length]);

  if (dismissed || !latest || isStreaming) return null;

  const cooldownActive =
    autoFix && autoAttempts >= MAX_AUTO_FIX_ATTEMPTS;

  return (
    <div className="absolute bottom-4 left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-4">
      <div className="flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-950/85 p-3 shadow-lg backdrop-blur-sm">
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

          {cooldownActive && (
            <p className="mt-1 text-[10px] text-amber-200/90">
              AI próbował naprawić {MAX_AUTO_FIX_ATTEMPTS}× — popraw ręcznie lub
              cofnij się do snapshotu.
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fire(latest, { auto: false })}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-beige px-2.5 py-1 text-[11px] font-medium text-beige-foreground transition hover:bg-beige/90"
            >
              <Sparkles className="h-3 w-3" />
              {autoCountdown != null
                ? `Naprawiam za ${autoCountdown}s…`
                : "Napraw przez AI"}
            </button>
            {autoCountdown != null && (
              <button
                type="button"
                onClick={() => {
                  if (cancelTimerRef.current) {
                    clearTimeout(cancelTimerRef.current);
                    cancelTimerRef.current = null;
                  }
                  setAutoCountdown(null);
                  setDismissed(true);
                }}
                className="text-[11px] text-rose-300 underline-offset-2 hover:text-rose-100 hover:underline"
              >
                Anuluj
              </button>
            )}
            <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-rose-200/90">
              <input
                type="checkbox"
                checked={autoFix}
                onChange={(e) => persistAutoFix(e.target.checked)}
                className="h-3 w-3 cursor-pointer accent-beige"
              />
              Auto-fix
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            setAutoCountdown(null);
          }}
          className="cursor-pointer text-rose-300/60 hover:text-rose-100"
          aria-label="Zamknij"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function errKey(e: IframeError): string {
  return `${e.kind}|${e.message}|${e.filename ?? ""}|${e.lineno ?? ""}`;
}
