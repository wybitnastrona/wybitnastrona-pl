import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import { getProductByPriceId } from "@/lib/stripe-products";

export const runtime = "nodejs";

/**
 * Webhook Stripe.
 *
 * Konfiguracja:
 *  1) Stripe Dashboard -> Webhooks -> Add endpoint
 *  2) URL: https://wybitnastrona.pl/api/stripe/webhook
 *  3) Wybierz eventy:
 *     - checkout.session.completed
 *     - invoice.paid
 *     - customer.subscription.deleted
 *     - customer.subscription.updated
 *  4) Sygnaturowy sekret -> ENV STRIPE_WEBHOOK_SECRET
 *
 * Idempotency: kazde wywolanie zaczynamy od UPSERT do `stripe_events`
 * z UNIQUE(event_id). Jezeli wstawienie sie powiodlo => event nowy.
 * Jezeli kolizja => event juz przetworzony, zwracamy 200 i wychodzimy.
 *
 * UWAGA: webhook uzywa SERVICE ROLE KEY do bezposredniego zapisu w tabelach,
 * z pominieciem RLS (bo wywolanie pochodzi od Stripe a nie od usera).
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

  // Idempotency check — table stripe_events (event_id PRIMARY KEY).
  // Jezeli unique constraint conflict => event juz przetworzony, OK.
  const { error: dupErr } = await supabase
    .from("stripe_events")
    .insert({ event_id: event.id, type: event.type });

  if (dupErr) {
    if (dupErr.code === "23505") {
      // duplicate key — juz przetworzony
      return NextResponse.json({ received: true, duplicate: true });
    }
    // table moze nie istniec jeszcze (migracja nie zostala wgrana) — kontynuuj
    if (!dupErr.message?.includes("relation")) {
      console.warn("[stripe webhook] idempotency insert failed:", dupErr.message);
    }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session);
        break;
      }

      case "invoice.paid": {
        await handleInvoicePaid(supabase, event.data.object as Stripe.Invoice);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "canceled",
            subscription_expires_at: null,
          })
          .eq("stripe_customer_id", sub.customer as string);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const tier = inferTierFromSubscription(sub);
        await supabase
          .from("profiles")
          .update({
            subscription_status: sub.status,
            subscription_tier: tier,
            subscription_expires_at: sub.cancel_at
              ? new Date(sub.cancel_at * 1000).toISOString()
              : null,
          })
          .eq("stripe_customer_id", sub.customer as string);
        break;
      }
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

  if (!userId) return;

  // Update payment row.
  await supabase
    .from("payments")
    .update({
      status: "succeeded",
      stripe_subscription_id: (session.subscription as string | null) ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_session_id", session.id);

  // Doladuj punkty.
  if (points > 0) {
    await supabase.rpc("add_points", { p_user_id: userId, amount: points });
  }

  if (tier && session.mode === "subscription") {
    await supabase
      .from("profiles")
      .update({
        subscription_tier: tier,
        subscription_status: "active",
      })
      .eq("id", userId);
  }
}

async function handleInvoicePaid(
  supabase: ReturnType<typeof getServiceClient>,
  invoice: Stripe.Invoice,
) {
  // billing_reason=subscription_create => juz obsluzylo checkout.session.completed
  if (invoice.billing_reason === "subscription_create") return;

  const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;
  if (!subscriptionId) return;

  const lineItem = invoice.lines.data[0];
  if (!lineItem) return;

  // Stripe API zwraca price.id w line.price.id (typed) lub line.pricing.price_details.price.
  type LineWithPrice = Stripe.InvoiceLineItem & {
    price?: { id?: string };
    pricing?: { price_details?: { price?: string } };
  };
  const li = lineItem as LineWithPrice;
  const priceId = li.price?.id ?? li.pricing?.price_details?.price ?? null;
  const product = priceId ? getProductByPriceId(String(priceId)) : null;
  if (!product) return;

  const customerId = invoice.customer as string;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (profile?.id && product.points > 0) {
    await supabase.rpc("add_points", {
      p_user_id: profile.id,
      amount: product.points,
    });

    await supabase.from("payments").insert({
      user_id: profile.id,
      stripe_subscription_id: subscriptionId,
      stripe_session_id: `invoice_${invoice.id}`,
      product_id: product.id,
      amount_cents: invoice.amount_paid,
      points_added: product.points,
      status: "succeeded",
    });
  }
}

function inferTierFromSubscription(sub: Stripe.Subscription): string | null {
  const item = sub.items.data[0];
  const priceId = item?.price?.id;
  if (!priceId) return null;
  const product = getProductByPriceId(priceId);
  return product?.id ?? null;
}
