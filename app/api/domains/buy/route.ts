import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProject, updateProjectCustomDomain } from "@/lib/projects";
import { addProjectDomain, purchaseDomain } from "@/lib/vercel";

export const runtime = "nodejs";

const DOMAIN_REGEX =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

/**
 * POST /api/domains/buy
 * body: { domain, projectId, expectedPrice? }
 *
 * Kupuje domene przez Vercel Domains API, dopina ja do projektu Vercel oraz
 * zapisuje jako `custom_domain` w bazie projektu.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { domain?: string; projectId?: string; expectedPrice?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const domain = (body.domain ?? "").trim().toLowerCase();
  const projectId = (body.projectId ?? "").trim();
  if (!domain || !projectId) {
    return NextResponse.json(
      { error: "Wymagane: domain + projectId" },
      { status: 400 },
    );
  }

  const cleaned = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!DOMAIN_REGEX.test(cleaned)) {
    return NextResponse.json(
      { error: "Nieprawidlowy format domeny" },
      { status: 400 },
    );
  }

  const project = await getProject(projectId);
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_PROJECT_ID) {
    return NextResponse.json(
      {
        error: "not_configured",
        message: "Vercel Domains API nie jest skonfigurowane na serwerze.",
      },
      { status: 503 },
    );
  }

  try {
    const purchase = await purchaseDomain(cleaned, body.expectedPrice);
    if (!purchase.ok) {
      return NextResponse.json(
        { error: purchase.error ?? "Zakup domeny nie powiodl sie" },
        { status: 502 },
      );
    }

    // Po zakupie — dopinamy domene do projektu Vercel.
    const attach = await addProjectDomain(cleaned);
    if (!attach.ok) {
      return NextResponse.json(
        {
          ok: true,
          purchased: purchase.domain,
          attached: false,
          warning: attach.error,
        },
      );
    }

    // Zapisz w bazie jako custom domain projektu.
    await updateProjectCustomDomain(projectId, cleaned);

    return NextResponse.json({
      ok: true,
      domain: cleaned,
      purchased: purchase.domain,
      attached: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Buy failed" },
      { status: 500 },
    );
  }
}
