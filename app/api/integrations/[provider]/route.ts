import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { IntegrationProvider } from "@/lib/integrations";

export const runtime = "nodejs";

type Params = { params: Promise<{ provider: string }> };

const VALID_PROVIDERS: IntegrationProvider[] = [
  "supabase",
  "supabase_oauth",
  "notion",
  "memory",
  "stitch",
  "stripe",
];

function isValidProvider(p: string): p is IntegrationProvider {
  return (VALID_PROVIDERS as string[]).includes(p);
}

export async function GET(_req: Request, { params }: Params) {
  const { provider } = await params;
  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_integrations")
    .select("provider, config, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ integration: data ?? null });
}

export async function POST(req: Request, { params }: Params) {
  const { provider } = await params;
  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { config?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const config = body.config ?? {};
  if (typeof config !== "object" || Array.isArray(config)) {
    return NextResponse.json({ error: "Invalid config" }, { status: 400 });
  }

  // Walidacja per provider — minimalne wymagane pola.
  if (provider === "supabase") {
    const url = String((config as Record<string, unknown>).url ?? "");
    const anon = String((config as Record<string, unknown>).anon_key ?? "");
    if (!url || !anon) {
      return NextResponse.json(
        { error: "Supabase wymaga pól url i anon_key" },
        { status: 400 },
      );
    }
    if (!/^https?:\/\//.test(url)) {
      return NextResponse.json(
        { error: "url musi byc prawidlowym URL z http(s)://" },
        { status: 400 },
      );
    }
  }
  if (provider === "notion") {
    const token = String(
      (config as Record<string, unknown>).integration_token ?? "",
    );
    if (!token) {
      return NextResponse.json(
        { error: "Notion wymaga integration_token" },
        { status: 400 },
      );
    }
  }

  const { error } = await supabase.from("user_integrations").upsert({
    user_id: user.id,
    provider,
    config,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { provider } = await params;
  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("user_integrations")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
