import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import { getProductByPriceId } from "@/lib/stripe-products";

export const runtime = "nodejs";

/**
 * Webhook Stripe — obsluguje one-time payments (top-up) + subscription lifecycle.
 *
 * Konfiguracja:
 *  1) Stripe Dashboard -> Webhooks -> Add endpoint
 *  2) URL: https://wybitnastrona.pl/api/stripe/webhook
 *  3) Wybierz eventy:
 *     - checkout.session.completed
 *     - customer.subscription.created
 *     - customer.subscription.updated
 *     - customer.subscription.deleted
 *     - invoice.paid (odswiezanie miesiecznych kredytow)
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
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(supabase, event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionCanceled(supabase, event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await handleInvoicePaid(supabase, event.data.object as Stripe.Invoice);
        break;
      default:
        break;
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
  const tier = session.metadata?.tier;
  const productKind = session.metadata?.product_kind;

  if (!userId) return;

  await supabase
    .from("payments")
    .update({
      status: "succeeded",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_session_id", session.id);

  // Topup: dodajemy kredyty od razu (one-time payment).
  if (productKind === "topup" && points > 0) {
    await supabase.rpc("add_points", { p_user_id: userId, amount: points });
  }

  // Subscription checkout completed: na ten event jeszcze NIE ustawiamy tieru —
  // czekamy na customer.subscription.created (ma wlasciwa kwote i okresy).
  // Ale jezeli wprost dostalismy tier (np. trial), mozemy ustawic juz teraz.
  if (productKind === "subscription" && tier) {
    await supabase
      .from("profiles")
      .update({ tier })
      .eq("id", userId);
  }
}

async function handleSubscriptionUpsert(
  supabase: ReturnType<typeof getServiceClient>,
  sub: Stripe.Subscription,
) {
  // Wyciagamy user_id z metadata na subscriptionie albo z customera.
  const userId = (sub.metadata?.user_id as string | undefined) ?? null;
  if (!userId) {
    console.warn("[stripe webhook] subscription has no user_id metadata:", sub.id);
    return;
  }

  const tier = (sub.metadata?.tier as string | undefined) ?? "pro";
  // status: 'active', 'trialing', 'past_due', 'canceled', 'incomplete'...
  const isActive = sub.status === "active" || sub.status === "trialing";

  await supabase
    .from("profiles")
    .update({
      tier: isActive ? tier : "free",
    })
    .eq("id", userId);
}

async function handleSubscriptionCanceled(
  supabase: ReturnType<typeof getServiceClient>,
  sub: Stripe.Subscription,
) {
  const userId = (sub.metadata?.user_id as string | undefined) ?? null;
  if (!userId) return;
  await supabase.from("profiles").update({ tier: "free" }).eq("id", userId);
}

async function handleInvoicePaid(
  supabase: ReturnType<typeof getServiceClient>,
  invoice: Stripe.Invoice,
) {
  // Miesieczne odswiezanie kredytow dla subskrybentow.
  // Stripe nie zawsze daje user_id w invoice.metadata, ale dostajemy customer.
  const customer = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customer) return;

  // Znajdz profil po stripe_customer_id.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, tier")
    .eq("stripe_customer_id", customer)
    .maybeSingle();

  if (!profile) return;

  // Dla planu PRO = 500 kredytow / mc, WYBITNY = 5000.
  const monthlyCredits = profile.tier === "wybitny" ? 5000 : profile.tier === "pro" ? 500 : 0;
  if (monthlyCredits > 0) {
    await supabase.rpc("add_points", { p_user_id: profile.id, amount: monthlyCredits });
    await supabase
      .from("profiles")
      .update({
        monthly_credits_used: 0,
        monthly_credits_reset_at: new Date().toISOString(),
      })
      .eq("id", profile.id);
  }
}

// Kept for backward compat — no longer used but avoids TS errors if imported elsewhere.
export function getProductByPriceIdAlias(priceId: string) {
  return getProductByPriceId(priceId);
}
