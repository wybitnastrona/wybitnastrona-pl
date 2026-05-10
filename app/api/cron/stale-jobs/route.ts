import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Called by Vercel Cron — configure in vercel.json
export const dynamic = "force-dynamic";

/**
 * Marks generation_jobs as 'stalled' if they have been in 'running' status
 * for more than 2 minutes without an updated_at heartbeat.
 * Vercel Cron: run every 5 minutes  */
export async function GET(req: Request) {
  // Simple security: Vercel adds this header automatically for cron jobs.
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET ?? ""}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("mark_stale_jobs");
  if (error) {
    console.error("[stale-jobs cron]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, affected: data ?? 0 });
}
