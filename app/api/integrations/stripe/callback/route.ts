import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Stripe Connect — callback handler.
 *
 * Wymiana code → access_token + stripe_user_id (acct_xxx).
 * Zapis w user_integrations (provider=stripe).
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state" },
      { status: 400 },
    );
  }

  const [stateUserId, projectId] = state.split(":");
  if (stateUserId !== user.id || !projectId) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    );
  }

  // Exchange code for credentials.
  // https://stripe.com/docs/connect/oauth-reference#post-token
  const tokenRes = await fetch("https://connect.stripe.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_secret: secretKey,
      code,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return NextResponse.json(
      {
        error: "token_exchange_failed",
        details: text.slice(0, 300),
      },
      { status: 500 },
    );
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    stripe_user_id: string;
    stripe_publishable_key?: string;
    livemode?: boolean;
    scope?: string;
  };

  const { error: upsertError } = await supabase
    .from("user_integrations")
    .upsert(
      {
        user_id: user.id,
        provider: "stripe",
        config: {
          stripe_user_id: tokens.stripe_user_id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          publishable_key: tokens.stripe_publishable_key ?? null,
          livemode: tokens.livemode ?? false,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );

  if (upsertError) {
    return NextResponse.json(
      { error: "save_failed", details: upsertError.message },
      { status: 500 },
    );
  }

  const back = new URL(`/project/${projectId}`, appUrl);
  back.searchParams.set("stripe_connected", "1");
  return NextResponse.redirect(back.toString());
}
