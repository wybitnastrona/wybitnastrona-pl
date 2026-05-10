import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/lib/projects";
import type { TemplateId } from "@/lib/templates";

export const runtime = "nodejs";

/**
 * Tworzy nowy projekt.
 * Body: { prompt: string, template?: TemplateId }
 * Returns: { id: string }
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { prompt?: string; template?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  try {
    const project = await createProject(prompt, body.template as TemplateId);
    return NextResponse.json({ id: project.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
