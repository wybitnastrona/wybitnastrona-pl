import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AnalyticsEventType =
  | "view"
  | "prompt"
  | "publish"
  | "remix"
  | "edit"
  | "export"
  | "error";

/**
 * Loguje event w bazie. Fire-and-forget — nie czekamy na error,
 * najwyzej zalogujemy do konsoli.
 */
export async function logProjectEvent(
  supabase: SupabaseClient,
  args: {
    projectId: string;
    type: AnalyticsEventType;
    userId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await supabase.from("project_events").insert({
      project_id: args.projectId,
      event_type: args.type,
      user_id: args.userId ?? null,
      metadata: args.metadata ?? null,
    });
  } catch (err) {
    console.warn("[analytics] insert failed", err);
  }
}
