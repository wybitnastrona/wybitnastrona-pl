"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type GenerationProgress = {
  jobId: string;
  status: "running" | "completed" | "failed" | "stalled";
  currentAction: string | null;
  step: number;
  filesWritten: string[];
  filesPatched: string[];
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  pointsSpent: number | null;
  /** Job zakończony z prośbą o kontynuację (limit czasu/kroków). */
  isContinue?: boolean;
};

/**
 * Subscribes to Supabase Realtime changes on generation_jobs for the given
 * project.  Returns the latest progress snapshot, or null if no active job.
 *
 * Also does an initial SELECT so we pick up any job that started before the
 * subscription was established (avoids missed events on fast networks).
 */
export function useGenerationProgress(projectId: string): GenerationProgress | null {
  const [progress, setProgress] = useState<GenerationProgress | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    function applyRow(row: Record<string, unknown>) {
      if (cancelled) return;
      const status = row.status as GenerationProgress["status"];
      const isContinue = Boolean(row.is_continue);
      setProgress({
        jobId: row.id as string,
        status,
        currentAction: (row.current_action as string | null) ?? null,
        step: (row.current_step as number) ?? 0,
        filesWritten: (row.files_written as string[]) ?? [],
        filesPatched: (row.files_patched as string[]) ?? [],
        inputTokens: (row.input_tokens as number | null) ?? null,
        outputTokens: (row.output_tokens as number | null) ?? null,
        totalTokens: (row.total_tokens as number | null) ?? null,
        pointsSpent: (row.points_spent as number | null) ?? null,
        isContinue,
      });
      if (status === "completed" && !isContinue) {
        setTimeout(() => {
          if (!cancelled) setProgress(null);
        }, 8000);
      } else if (status === "completed" && isContinue) {
        setTimeout(() => {
          if (!cancelled) setProgress(null);
        }, 120_000);
      } else if (status === "failed" || status === "stalled") {
        setTimeout(() => {
          if (!cancelled) setProgress(null);
        }, 120_000);
      }
    }

    // Initial fetch — running job, albo ostatni „handoff” (completed + is_continue).
    void (async () => {
      const { data: running } = await supabase
        .from("generation_jobs")
        .select("*")
        .eq("project_id", projectId)
        .in("status", ["running", "pending"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (running) {
        applyRow(running as Record<string, unknown>);
        return;
      }
      const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data: handoff } = await supabase
        .from("generation_jobs")
        .select("*")
        .eq("project_id", projectId)
        .eq("status", "completed")
        .eq("is_continue", true)
        .gte("finished_at", since)
        .order("finished_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && handoff) applyRow(handoff as Record<string, unknown>);
    })();

    // Realtime subscription.
    const channel = supabase
      .channel(`gen_jobs:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "generation_jobs",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as Record<string, unknown> | null;
          if (row) applyRow(row);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [projectId]);

  return progress;
}
