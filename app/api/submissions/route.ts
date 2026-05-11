import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * GET /api/submissions?projectId=...
 *   Lista submission dla projektu (RLS owner-only).
 *
 * POST /api/submissions
 *   Tworzy draft submission. Body: { project_id, platform, ... }
 *
 * PATCH /api/submissions
 *   Aktualizuje istniejacy draft. Body: { id, ...fields }
 */

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId)
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const { data, error } = await supabase
    .from("project_submissions")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submissions: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const projectId = body.project_id as string | undefined;
  const platform = body.platform as "ios" | "android" | undefined;
  if (!projectId || !platform) {
    return NextResponse.json(
      { error: "project_id and platform are required" },
      { status: 400 },
    );
  }

  // Verify project ownership
  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const insertPayload: Record<string, unknown> = {
    project_id: projectId,
    user_id: user.id,
    platform,
    status: body.status ?? "draft",
  };
  for (const k of [
    "app_name",
    "bundle_id",
    "version",
    "build_number",
    "category",
    "description",
    "keywords",
    "privacy_policy_url",
    "marketing_url",
  ] as const) {
    if (k in body) insertPayload[k] = body[k];
  }

  const { data, error } = await supabase
    .from("project_submissions")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = body.id as string | undefined;
  if (!id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Sanitize allowed fields.
  const allowed = [
    "app_name",
    "bundle_id",
    "version",
    "build_number",
    "category",
    "description",
    "keywords",
    "privacy_policy_url",
    "marketing_url",
    "asc_app_id",
    "status",
  ] as const;
  const updates: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) updates[k] = body[k];
  }

  const { error } = await supabase
    .from("project_submissions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id });
}
