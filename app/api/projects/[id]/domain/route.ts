import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProject, updateProjectCustomDomain } from "@/lib/projects";
import { addProjectDomain, removeProjectDomain } from "@/lib/vercel";

type Params = Promise<{ id: string }>;

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

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

  let body: { domain?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = (body.domain ?? "").trim().toLowerCase();
  if (!raw) {
    return NextResponse.json(
      { error: "Domena jest wymagana" },
      { status: 400 },
    );
  }

  const cleaned = raw.replace(/^https?:\/\//, "").replace(/\/$/, "");

  if (!DOMAIN_REGEX.test(cleaned)) {
    return NextResponse.json(
      { error: "Nieprawidlowy format domeny" },
      { status: 400 },
    );
  }

  try {
    await updateProjectCustomDomain(id, cleaned);

    // Faza 2.4: zarejestruj domene w Vercel (best-effort).
    let vercelOk = true;
    let vercelError: string | undefined;
    if (process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID) {
      const result = await addProjectDomain(cleaned);
      vercelOk = result.ok;
      vercelError = result.error;
    }

    return NextResponse.json({
      ok: true,
      domain: cleaned,
      vercel: { ok: vercelOk, error: vercelError },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
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

  try {
    if (project.custom_domain && process.env.VERCEL_TOKEN) {
      await removeProjectDomain(project.custom_domain);
    }
    await updateProjectCustomDomain(id, null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
