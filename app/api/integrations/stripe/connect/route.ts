import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Stripe Connect OAuth — initiate flow (Standard accounts).
 *
 * Wymagane env:
 *   STRIPE_CONNECT_CLIENT_ID — z dashboard.stripe.com/settings/connect
 *   NEXT_PUBLIC_APP_URL
 *
 * Query params:
 *   projectId — id projektu wybitnastrona, do ktorego ma byc podpiety Stripe.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  if (!clientId) {
    return NextResponse.json(
      {
        error: "not_configured",
        message:
          "Stripe Connect nie jest skonfigurowany na serwerze (brak STRIPE_CONNECT_CLIENT_ID).",
      },
      { status: 503 },
    );
  }

  const redirectUri = `${appUrl}/api/integrations/stripe/callback`;
  const state = `${user.id}:${projectId}`;

  const authUrl = new URL("https://connect.stripe.com/oauth/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", "read_write");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
