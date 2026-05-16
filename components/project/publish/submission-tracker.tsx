"use client";

/**
 * Submission Tracker.
 *
 * Real-time podglad statusu submission (TestFlight / Play). Polling co 3s +
 * Supabase Realtime subscribe na `project_submissions` aby UI sie odświeżalo
 * gdy webhook Codemagic/EAS zaktualizuje rekord.
 */

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  Loader2,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Status =
  | "draft"
  | "queued"
  | "building"
  | "uploaded"
  | "submitted"
  | "failed"
  | "canceled";

type Submission = {
  id: string;
  platform: "ios" | "android";
  status: Status;
  codemagic_status: string | null;
  testflight_url: string | null;
  app_store_url: string | null;
  log_lines: string[] | null;
  error_message: string | null;
  updated_at: string;
};

const STEPS: { key: Status; label: string }[] = [
  { key: "queued", label: "W kolejce" },
  { key: "building", label: "Budowanie" },
  { key: "uploaded", label: "Upload do App Store / Play" },
  { key: "submitted", label: "Wyslano do recenzji" },
];

type Props = {
  submissionId: string;
};

export function SubmissionTracker({ submissionId }: Props) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchOnce() {
      const res = await fetch(`/api/submissions/${submissionId}/status`, {
        cache: "no-store",
      });
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as Submission;
      setSubmission(data);
    }

    fetchOnce();

    // Supabase Realtime subscription
    const supabase = createClient();
    const channel = supabase
      .channel(`submission-${submissionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "project_submissions",
          filter: `id=eq.${submissionId}`,
        },
        (payload) => {
          setSubmission(payload.new as Submission);
        },
      )
      .subscribe();

    // Backup polling - co 5s gdy webhook sie spozni
    const interval = setInterval(fetchOnce, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [submissionId]);

  if (!submission) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-beige/15 bg-card/40 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-beige/70" />
        Pobieram status submission...
      </div>
    );
  }

  const isTerminal =
    submission.status === "submitted" ||
    submission.status === "failed" ||
    submission.status === "canceled";

  const currentStepIdx = STEPS.findIndex((s) => s.key === submission.status);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-beige/15 bg-card/40 p-5">
      {/* Steps */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => {
          const reached = currentStepIdx >= i && submission.status !== "failed";
          const current = currentStepIdx === i && !isTerminal;
          const failed = submission.status === "failed" && i === currentStepIdx + 1;

          return (
            <div key={step.key} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  failed
                    ? "border-rose-500/50 bg-rose-950/40 text-rose-300"
                    : reached
                      ? "border-beige/50 bg-beige/15 text-beige"
                      : "border-beige/15 bg-background/40 text-muted-foreground"
                }`}
              >
                {failed ? (
                  <XCircle className="h-3 w-3" />
                ) : current ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : reached ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <CircleDashed className="h-3 w-3" />
                )}
              </span>
              <span
                className={`text-xs ${
                  reached ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="ml-1 h-px flex-1 bg-beige/10" />
              )}
            </div>
          );
        })}
      </div>

      {/* Status detail */}
      <div className="rounded-md border border-beige/10 bg-background/40 px-3 py-2 text-[12px]">
        <p className="text-foreground">
          Status: <span className="font-mono">{submission.status}</span>
          {submission.codemagic_status && (
            <span className="ml-2 text-muted-foreground">
              ({submission.codemagic_status})
            </span>
          )}
        </p>
        {submission.error_message && (
          <p className="mt-1 text-rose-300">{submission.error_message}</p>
        )}
      </div>

      {/* Result URLs */}
      {(submission.testflight_url || submission.app_store_url) && (
        <div className="flex flex-col gap-1 text-xs">
          {submission.testflight_url && (
            <a
              href={submission.testflight_url}
              target="_blank"
              rel="noopener"
              className="text-beige hover:underline"
            >
              Otwórz w TestFlight
            </a>
          )}
          {submission.app_store_url && (
            <a
              href={submission.app_store_url}
              target="_blank"
              rel="noopener"
              className="text-beige hover:underline"
            >
              Otwórz w App Store
            </a>
          )}
        </div>
      )}

      {/* Logs (expandable) */}
      {submission.log_lines && submission.log_lines.length > 0 && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setShowLogs((v) => !v)}
            className="flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground hover:text-beige"
          >
            {showLogs ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            Logi buildu ({submission.log_lines.length} linii)
          </button>
          {showLogs && (
            <pre className="max-h-64 overflow-auto rounded-md border border-beige/10 bg-background/40 p-3 font-mono text-[10px] leading-relaxed text-foreground/80">
              {submission.log_lines.join("\n")}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
