import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type GenerationJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "stalled";

export type GenerationJob = {
  id: string;
  project_id: string;
  user_id: string;
  status: GenerationJobStatus;
  mode: "plan" | "build" | "discuss" | "continue";
  model: string;
  current_step: number;
  total_steps: number | null;
  current_action: string | null;
  files_written: string[];
  files_patched: string[];
  error: string | null;
  started_at: string;
  updated_at: string;
  finished_at: string | null;
  is_continue?: boolean;
};

/** Creates a new running generation job and returns its id. */
export async function createJob(
  supabase: SupabaseClient,
  opts: {
    projectId: string;
    userId: string;
    mode: "plan" | "build" | "discuss" | "continue";
    model: string;
  },
): Promise<string> {
  const { data, error } = await supabase
    .from("generation_jobs")
    .insert({
      project_id: opts.projectId,
      user_id: opts.userId,
      status: "running",
      mode: opts.mode,
      model: opts.model,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[generation-jobs] createJob failed:", error);
    return "00000000-0000-0000-0000-000000000000";
  }
  return data.id as string;
}

/**
 * Atomically increments step, sets current action, optionally appends to
 * files_written or files_patched.
 */
export async function bumpJob(
  supabase: SupabaseClient,
  jobId: string,
  action: string,
  fileChange?: { path: string; kind: "write" | "patch" },
): Promise<void> {
  const { error } = await supabase.rpc("bump_job", {
    p_job_id: jobId,
    p_action: action,
    p_file_path: fileChange?.path ?? null,
    p_file_kind: fileChange?.kind ?? null,
  });
  if (error) console.error("[generation-jobs] bumpJob failed:", error);
}

/** Marks the job as completed or failed. Optionally records token usage and deducts credits. */
export async function finishJob(
  supabase: SupabaseClient,
  jobId: string,
  status: "completed" | "failed" = "completed",
  errorMsg?: string,
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    pointsSpent?: number;
    /** true = job zakończony na granicy czasu/kroków; użytkownik może kliknąć „Kontynuuj". */
    isContinue?: boolean;
    /** Kredyty do odjecia z profiles.points (atomicznie w finish_job RPC). */
    pointsConsumed?: number;
  },
): Promise<void> {
  const { error } = await supabase.rpc("finish_job", {
    p_job_id: jobId,
    p_status: status,
    p_error: errorMsg ?? null,
    p_input_tokens: usage?.inputTokens ?? null,
    p_output_tokens: usage?.outputTokens ?? null,
    p_total_tokens: usage?.totalTokens ?? null,
    p_points_spent: usage?.pointsSpent ?? null,
    p_is_continue: usage?.isContinue ?? false,
    p_points_consumed: usage?.pointsConsumed ?? 0,
  });
  if (error) console.error("[generation-jobs] finishJob failed:", error);
}
