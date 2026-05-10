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
      });
      // Keep completed jobs visible longer so the user can see token cost,
      // then clear so the UI stops showing it.
      if (status === "completed" || status === "failed" || status === "stalled") {
        setTimeout(() => {
          if (!cancelled) setProgress(null);
        }, 6000);
      }
    }

    // Initial fetch — get the most recent running job for this project.
    void supabase
      .from("generation_jobs")
      .select("*")
      .eq("project_id", projectId)
      .in("status", ["running", "pending"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) applyRow(data as Record<string, unknown>);
      });

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
