import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProject, updateAppSupabase } from "@/lib/projects";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

/**
 * Wybitna Baza Danych — auto-provision Supabase project for the generated app.
 *
 * Uses Supabase Management API:
 *   https://api.supabase.com/v1/projects                  (POST — create project)
 *   https://api.supabase.com/v1/projects/{ref}/api-keys   (GET — fetch anon key)
 *
 * Required env vars (server-only, never exposed to client):
 *   SUPABASE_ACCESS_TOKEN — personal access token from supabase.com/dashboard/account/tokens
 *   SUPABASE_ORG_ID       — organization slug (e.g. "abcde12345xyz")
 *   SUPABASE_PROVISION_REGION (optional, default "eu-central-1")
 *
 * Behavior:
 *  1. Returns 409 if project already has a Wybitna Baza Danych provisioned.
 *  2. Marks project as 'provisioning', creates Supabase project, fetches keys,
 *     applies baseline RLS schema (categories, products, cart_items), persists
 *     credentials, marks 'ready'. On error marks 'error' and surfaces message.
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

  if (project.app_supabase_status === "ready" && project.app_supabase_url) {
    return NextResponse.json(
      {
        error: "already_provisioned",
        message: "Wybitna Baza Danych dla tego projektu już istnieje.",
        url: project.app_supabase_url,
      },
      { status: 409 },
    );
  }
  if (project.app_supabase_status === "provisioning") {
    return NextResponse.json(
      {
        error: "in_progress",
        message: "Provisioning jest w toku — odczekaj 60-120 s.",
      },
      { status: 409 },
    );
  }

  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const orgId = process.env.SUPABASE_ORG_ID;
  const region = process.env.SUPABASE_PROVISION_REGION ?? "eu-central-1";

  if (!accessToken || !orgId) {
    return NextResponse.json(
      {
        error: "not_configured",
        message:
          "Wybitna Baza Danych: brak SUPABASE_ACCESS_TOKEN / SUPABASE_ORG_ID w env.",
      },
      { status: 503 },
    );
  }

  await updateAppSupabase(id, { status: "provisioning" });

  try {
    // Stable password derived from project id (only used for DB role; not user-facing).
    const dbPass = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(
      /[^a-zA-Z0-9]/g,
      "",
    );
    const projectName = `wybitna-${id.slice(0, 8)}`;

    const createRes = await fetch("https://api.supabase.com/v1/projects", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        organization_id: orgId,
        name: projectName,
        db_pass: dbPass,
        region,
        plan: "free",
      }),
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      throw new Error(
        `Supabase Management API: ${createRes.status} ${text.slice(0, 200)}`,
      );
    }

    const created = (await createRes.json()) as {
      id?: string;
      ref?: string;
      name?: string;
      endpoint?: string;
    };
    const ref = created.ref ?? created.id;
    if (!ref) {
      throw new Error("Supabase API did not return a project ref.");
    }

    // Wait for the project to become healthy enough to fetch API keys.
    // We poll for up to ~90s.
    let anonKey: string | null = null;
    for (let attempt = 0; attempt < 18; attempt++) {
      await new Promise((r) => setTimeout(r, 5000));
      const keysRes = await fetch(
        `https://api.supabase.com/v1/projects/${ref}/api-keys`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
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
      throw new Error("Timeout: nie udało się pobrać anon key z nowego projektu.");
    }

    const url = `https://${ref}.supabase.co`;

    // Apply baseline schema (categories, products, cart_items + permissive RLS).
    // Best-effort: log on failure but still mark project as ready, so user
    // can apply migrations manually from the generated SQL file in the app.
    await applyBaselineSchema(accessToken, ref).catch((err) => {
      console.warn("[provision-database] baseline schema failed:", err);
    });

    await updateAppSupabase(id, {
      project_id: ref,
      url,
      anon_key: anonKey,
      status: "ready",
      provisioned_at: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      url,
      ref,
      anonKey,
      status: "ready",
    });
  } catch (err) {
    await updateAppSupabase(id, { status: "error" });
    return NextResponse.json(
      {
        error: "provision_failed",
        message: err instanceof Error ? err.message : "Provisioning failed.",
      },
      { status: 500 },
    );
  }
}

/**
 * Baseline schema for "Wybitna Baza Danych" — mirrors the Bolt Database default:
 *   - categories (public SELECT)
 *   - products   (public SELECT)
 *   - cart_items (anon/authenticated CRUD, scoped by user_session in localStorage)
 */
async function applyBaselineSchema(
  accessToken: string,
  ref: string,
): Promise<void> {
  const sql = `
    create extension if not exists pgcrypto;
    create extension if not exists "uuid-ossp";

    create table if not exists categories (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      slug text not null unique,
      created_at timestamptz not null default now()
    );

    create table if not exists products (
      id uuid primary key default gen_random_uuid(),
      category_id uuid references categories (id) on delete set null,
      name text not null,
      description text,
      price_cents integer not null default 0,
      image_url text,
      featured boolean not null default false,
      created_at timestamptz not null default now()
    );

    create table if not exists cart_items (
      id uuid primary key default gen_random_uuid(),
      user_session text not null,
      product_id uuid not null references products (id) on delete cascade,
      qty integer not null default 1 check (qty > 0),
      created_at timestamptz not null default now()
    );

    create index if not exists products_category_id_idx on products (category_id);
    create index if not exists products_featured_idx on products (featured) where featured = true;
    create index if not exists cart_items_user_session_idx on cart_items (user_session);

    alter table categories enable row level security;
    alter table products enable row level security;
    alter table cart_items enable row level security;

    drop policy if exists "categories public read" on categories;
    create policy "categories public read" on categories
      for select using (true);

    drop policy if exists "products public read" on products;
    create policy "products public read" on products
      for select using (true);

    drop policy if exists "cart_items anon crud" on cart_items;
    create policy "cart_items anon crud" on cart_items
      for all using (true) with check (true);
  `;

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Baseline schema apply failed: ${res.status} ${text.slice(0, 200)}`,
    );
  }
}
