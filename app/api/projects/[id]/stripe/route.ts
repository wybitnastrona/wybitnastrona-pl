import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * PUT /api/projects/[id]/stripe
 *
 * Zapisuje konfiguracje Stripe per projekt.
 * - publishableKey: klucz publiczny (pk_live_ / pk_test_) — zapisywany jako plain text.
 * - secretKey: klucz prywatny (sk_live_ / sk_test_) — zapisywany jako "zaszyfrowany" (base64 MVP, TODO: KMS).
 * - webhookSecret: signing secret webhooka.
 *
 * GET /api/projects/[id]/stripe
 * Zwraca { publishableKey, hasSecretKey, hasWebhookSecret } — BEZ odkrytych kluczy prywatnych.
 */

type Body = {
  publishableKey?: string | null;
  secretKey?: string | null;
  webhookSecret?: string | null;
};

// MVP: base64 "szyfrowanie" — w produkcji zastap Supabase Vault / AWS KMS.
function encodeKey(key: string): string {
  return Buffer.from(key).toString("base64");
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify ownership.
  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates: Record<string, string | null> = {};

  if (body.publishableKey !== undefined) {
    const pk = body.publishableKey?.trim() ?? null;
    if (pk && !pk.startsWith("pk_")) {
      return NextResponse.json(
        { error: "publishableKey must start with pk_" },
        { status: 400 },
      );
    }
    updates.stripe_publishable_key = pk;
  }

  if (body.secretKey !== undefined) {
    const sk = body.secretKey?.trim() ?? null;
    if (sk) {
      if (!sk.startsWith("sk_")) {
        return NextResponse.json(
          { error: "secretKey must start with sk_" },
          { status: 400 },
        );
      }
      updates.stripe_secret_key_enc = encodeKey(sk);
    } else {
      updates.stripe_secret_key_enc = null;
    }
  }

  if (body.webhookSecret !== undefined) {
    const wh = body.webhookSecret?.trim() ?? null;
    updates.stripe_webhook_secret = wh ? encodeKey(wh) : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, message: "Nothing to update" });
  }

  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("user_id, stripe_publishable_key, stripe_secret_key_enc, stripe_webhook_secret")
    .eq("id", id)
    .maybeSingle();

  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    publishableKey: project.stripe_publishable_key ?? null,
    hasSecretKey: Boolean(project.stripe_secret_key_enc),
    hasWebhookSecret: Boolean(project.stripe_webhook_secret),
  });
}
