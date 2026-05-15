import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProject, setProjectDbEnabled } from "@/lib/projects";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

/**
 * Wybitna Baza Danych — activate shared database for a project.
 *
 * POST — sets app_db_enabled = true so the AI starts injecting shared DB
 *        context into code generation prompts.
 *
 * DELETE — reverts app_db_enabled = false (disconnect).
 *
 * No external API calls: the shared Supabase instance already exists and
 * data isolation is enforced by RLS using the x-project-id header.
 */

export async function POST(_req: Request, { params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await getProject(id);
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const sharedUrl = process.env.NEXT_PUBLIC_APP_DB_URL;
  if (!sharedUrl) {
    return NextResponse.json(
      {
        error: "not_configured",
        message:
          "Wybitna Baza Danych nie jest jeszcze skonfigurowana na tym serwerze. Skontaktuj sie z administratorem.",
      },
      { status: 503 },
    );
  }

  await setProjectDbEnabled(id, true);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await getProject(id);
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await setProjectDbEnabled(id, false);

  return NextResponse.json({ ok: true });
}
