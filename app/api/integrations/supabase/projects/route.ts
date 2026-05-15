import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects";

export const runtime = "nodejs";

/**
 * GET /api/integrations/supabase/projects?token=<PAT>
 * Pobiera liste projektow Supabase uzytkownika przez Management API,
 * uzywajac Personal Access Token (PAT) przeslanego przez klienta.
 *
 * PAT generuje uzytkownik na: supabase.com/dashboard/account/tokens
 * PAT NIE jest zapisywany po stronie serwera — sluzy tylko do pobrania
 * listy projektow i anon keya w trakcie flow konfiguracji.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const [listRes, orgRes] = await Promise.all([
    fetch("https://api.supabase.com/v1/projects", {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch("https://api.supabase.com/v1/organizations", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  if (!listRes.ok) {
    const text = await listRes.text().catch(() => "");
    if (listRes.status === 401) {
      return NextResponse.json(
        {
          error: "invalid_token",
          message:
            "Nieprawidlowy token. Upewnij sie ze skopiowales caly PAT z supabase.com/dashboard/account/tokens.",
        },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "supabase_api_failed", details: text.slice(0, 300) },
      { status: 500 },
    );
  }

  const projects = (await listRes.json()) as Array<{
    id: string;
    ref?: string;
    name: string;
    organization_id: string;
    region?: string;
    status?: string;
  }>;

  const orgs = orgRes.ok
    ? ((await orgRes.json()) as Array<{ id: string; name: string }>)
    : [];

  return NextResponse.json({ projects, organizations: orgs });
}

/**
 * POST /api/integrations/supabase/projects
 * Body: { projectId, token, action: "attach"|"create", ref?, name?, orgId?, region? }
 *
 * Nie zapisuje PAT — uzywa go jednorazowo do pobrania anon key,
 * potem wpisuje tylko database_url + database_anon_key do projects row.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    projectId?: string;
    token?: string;
    action?: "attach" | "create";
    ref?: string;
    name?: string;
    orgId?: string;
    region?: string;
  };

  const token = body.token?.trim();
  if (!token)
    return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const wybitnaProjectId = body.projectId;
  if (!wybitnaProjectId)
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const wybitnaProject = await getProject(wybitnaProjectId);
  if (!wybitnaProject || wybitnaProject.user_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let ref: string;

  if (body.action === "create") {
    if (!body.name || !body.orgId) {
      return NextResponse.json(
        { error: "Missing name or orgId" },
        { status: 400 },
      );
    }
    const dbPass = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(
      /[^a-zA-Z0-9]/g,
      "",
    );
    const createRes = await fetch("https://api.supabase.com/v1/projects", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        organization_id: body.orgId,
        name: body.name,
        db_pass: dbPass,
        region: body.region ?? "eu-central-1",
        plan: "free",
      }),
    });
    if (!createRes.ok) {
      return NextResponse.json(
        {
          error: "create_failed",
          details: await createRes.text().catch(() => ""),
        },
        { status: 500 },
      );
    }
    const created = (await createRes.json()) as { id?: string; ref?: string };
    ref = (created.ref ?? created.id) as string;
    if (!ref) {
      return NextResponse.json({ error: "no_ref_returned" }, { status: 500 });
    }
  } else {
    if (!body.ref)
      return NextResponse.json({ error: "Missing ref" }, { status: 400 });
    ref = body.ref;
  }

  // Pobierz anon key (poll do 90s gdy projekt swiezo utworzony).
  let anonKey: string | null = null;
  const maxAttempts = body.action === "create" ? 18 : 1;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 5000));
    const keysRes = await fetch(
      `https://api.supabase.com/v1/projects/${ref}/api-keys`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!keysRes.ok) continue;
    const keys = (await keysRes.json()) as Array<{
      name: string;
      api_key: string;
    }>;
    const anon = keys.find((k) => k.name === "anon");
    if (anon?.api_key) {
      anonKey = anon.api_key;
      break;
    }
  }
  if (!anonKey) {
    return NextResponse.json(
      { error: "no_anon_key", message: "Nie udalo sie pobrac anon key." },
      { status: 500 },
    );
  }

  const dbUrl = `https://${ref}.supabase.co`;

  const { error: updateError } = await supabase
    .from("projects")
    .update({ database_url: dbUrl, database_anon_key: anonKey })
    .eq("id", wybitnaProjectId);

  if (updateError) {
    return NextResponse.json(
      { error: "save_failed", details: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, url: dbUrl, ref });
}
