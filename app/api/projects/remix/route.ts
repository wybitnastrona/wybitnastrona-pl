import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProjectFiles } from "@/lib/types/project";
import { logProjectEvent } from "@/lib/analytics-server";

export const runtime = "nodejs";

/**
 * Klonuje istniejacy publiczny projekt na konto zalogowanego usera.
 *
 * Body: { projectId: string }
 * Returns: { id: string }  // ID nowego projektu
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { projectId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sourceId = body.projectId;
  if (!sourceId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const { data: source } = await supabase
    .from("projects")
    .select("title, prompt, files, template, is_public")
    .eq("id", sourceId)
    .maybeSingle();

  if (!source || !source.is_public) {
    return NextResponse.json({ error: "Project not found or not public" }, { status: 404 });
  }

  const { data: created, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      title: `Remix: ${source.title}`,
      prompt: source.prompt,
      files: source.files as ProjectFiles,
      template: source.template ?? "react-ts",
    })
    .select("id")
    .single();

  if (error || !created) {
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 500 });
  }

  void logProjectEvent(supabase, {
    projectId: sourceId,
    userId: user.id,
    type: "remix",
    metadata: { newProjectId: created.id },
  });

  return NextResponse.json({ id: created.id });
}
