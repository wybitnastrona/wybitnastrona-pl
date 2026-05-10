import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProject, updateProjectDatabase } from "@/lib/projects";

type Params = Promise<{ id: string }>;

const HTTPS_URL = /^https?:\/\/.+/i;

export async function PUT(req: Request, { params }: { params: Params }) {
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

  let body: { url?: string | null; anonKey?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = body.url?.trim() ? body.url.trim() : null;
  const anonKey = body.anonKey?.trim() ? body.anonKey.trim() : null;

  if (url && !HTTPS_URL.test(url)) {
    return NextResponse.json(
      { error: "URL musi zaczynac sie od http(s)://" },
      { status: 400 },
    );
  }

  try {
    await updateProjectDatabase(id, { url, anonKey });
    return NextResponse.json({ ok: true, url, anonKey });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
