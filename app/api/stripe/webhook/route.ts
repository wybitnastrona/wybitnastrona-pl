import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import { getProductByPriceId } from "@/lib/stripe-products";

export const runtime = "nodejs";

/**
 * Webhook Stripe — obsluguje wylacznie one-time payments (top-up kredytow).
 *
 * Konfiguracja:
 *  1) Stripe Dashboard -> Webhooks -> Add endpoint
 *  2) URL: https://wybitnastrona.pl/api/stripe/webhook
 *  3) Wybierz eventy:
 *     - checkout.session.completed
 *  4) Sygnaturowy sekret -> ENV STRIPE_WEBHOOK_SECRET
 *
 * Idempotency: UPSERT do `stripe_events` z UNIQUE(event_id).
 */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE service role not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret)
    return NextResponse.json({ error: "Webhook secret not set" }, { status: 500 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("[stripe webhook] signature verify failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Idempotency — stripe_events.event_id PRIMARY KEY.
  const { error: dupErr } = await supabase
    .from("stripe_events")
    .insert({ event_id: event.id, type: event.type });

  if (dupErr) {
    if (dupErr.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (!dupErr.message?.includes("relation")) {
      console.warn("[stripe webhook] idempotency insert failed:", dupErr.message);
    }
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session);
    }
  } catch (err) {
    console.error("[stripe webhook] handler error", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof getServiceClient>,
  session: Stripe.Checkout.Session,
) {
  const userId = session.metadata?.user_id;
  const points = Number(session.metadata?.points ?? 0);

  if (!userId) return;

  await supabase
    .from("payments")
    .update({
      status: "succeeded",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_session_id", session.id);

  if (points > 0) {
    await supabase.rpc("add_points", { p_user_id: userId, amount: points });
  }
}

// Kept for backward compat — no longer used but avoids TS errors if imported elsewhere.
export function getProductByPriceIdAlias(priceId: string) {
  return getProductByPriceId(priceId);
}
