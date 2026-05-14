import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import {
  getProductByPriceId,
  getProTierByPriceId,
} from "@/lib/stripe-products";
import { generateProjectAutoSlug } from "@/lib/projects";

export const runtime = "nodejs";

/**
 * Webhook Stripe — Bolt-style slider PRO (8 poziomow), bez topupow.
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
    return NextResponse.json(
      { error: "Webhook secret not set" },
      { status: 500 },
    );

  const sig = req.headers.get("stripe-signature");
  if (!sig)
    return NextResponse.json({ error: "No signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("[stripe webhook] signature verify failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { error: dupErr } = await supabase
    .from("stripe_events")
    .insert({ event_id: event.id, type: event.type });

  if (dupErr) {
    if (dupErr.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (!dupErr.message?.includes("relation")) {
      console.warn(
        "[stripe webhook] idempotency insert failed:",
        dupErr.message,
      );
    }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          supabase,
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(
          supabase,
          event.data.object as Stripe.Subscription,
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionCanceled(
          supabase,
          event.data.object as Stripe.Subscription,
        );
        break;
      case "invoice.paid":
        await handleInvoicePaid(
          supabase,
          event.data.object as Stripe.Invoice,
        );
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
  if (!userId) return;

  await supabase
    .from("payments")
    .update({
      status: "succeeded",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_session_id", session.id);

  // Subscription checkout — nie ustawiamy tieru tutaj; czekamy na
  // customer.subscription.created (ma stabilne okresy i status).
  // Topupy zostaly usuniete z katalogu, ale historyczne checkouty moga
  // jeszcze trafic — w razie czego logujemy.
  if (session.mode === "payment") {
    console.warn(
      `[stripe webhook] received legacy one-time checkout (session=${session.id}); topupy zostaly wycofane.`,
    );
  }
}

async function handleSubscriptionUpsert(
  supabase: ReturnType<typeof getServiceClient>,
  sub: Stripe.Subscription,
) {
  const userId = (sub.metadata?.user_id as string | undefined) ?? null;
  if (!userId) {
    console.warn(
      "[stripe webhook] subscription has no user_id metadata:",
      sub.id,
    );
    return;
  }

  // Wszystkie subskrypcje z naszego katalogu to PRO (rozne tiery kredytow).
  const isActive = sub.status === "active" || sub.status === "trialing";

  // Wyszukujemy aktualny price ID + matchujacy ProTier dla atrybucji kredytow.
  const priceId = sub.items?.data?.[0]?.price?.id;
  const proTier = priceId ? getProTierByPriceId(priceId) : undefined;

  await supabase
    .from("profiles")
    .update({
      tier: isActive ? "pro" : "free",
      stripe_subscription_id: sub.id,
      stripe_subscription_status: sub.status,
      stripe_subscription_price_id: priceId ?? null,
      monthly_credit_quota: proTier?.credits ?? null,
    })
    .eq("id", userId);
}

async function handleSubscriptionCanceled(
  supabase: ReturnType<typeof getServiceClient>,
  sub: Stripe.Subscription,
) {
  const userId = (sub.metadata?.user_id as string | undefined) ?? null;
  if (!userId) return;

  // Anty-abuse: cofnij custom subdomeny do auto-generated; zachowaj historyczne.
  await revertCustomSlugsForUser(supabase, userId);

  await supabase
    .from("profiles")
    .update({
      tier: "free",
      stripe_subscription_status: "canceled",
      monthly_credit_quota: null,
    })
    .eq("id", userId);
}

/**
 * Dla wszystkich opublikowanych projektow usera z customowym slugiem (>2 znaki,
 * nie wyglada jak nanoid 10-znakowy) — wygeneruj nowy auto-slug i zarchiwizuj
 * poprzedni. Po reaktywacji subskrypcji user moze przywrocic stary slug recznie.
 */
async function revertCustomSlugsForUser(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
) {
  const { data: projects } = await supabase
    .from("projects")
    .select("id, slug, custom_slug_archived, is_public")
    .eq("user_id", userId)
    .eq("is_public", true);

  if (!projects?.length) return;

  // Heurystyka: auto-slug = 10 znakow nanoid bez kropek (np. "EhmjFEYmnZ").
  const AUTO_SLUG_LIKE = /^[A-Za-z0-9]{10}$/;
  const customs = projects.filter(
    (p) => p.slug && !AUTO_SLUG_LIKE.test(String(p.slug)),
  );

  for (const project of customs) {
    const newSlug = generateProjectAutoSlug();
    await supabase
      .from("projects")
      .update({
        slug: newSlug,
        custom_slug_archived: project.slug,
      })
      .eq("id", project.id);
  }
}

async function handleInvoicePaid(
  supabase: ReturnType<typeof getServiceClient>,
  invoice: Stripe.Invoice,
) {
  const customer =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;
  if (!customer) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, tier, stripe_subscription_price_id")
    .eq("stripe_customer_id", customer)
    .maybeSingle();

  if (!profile) return;

  // Bierzemy price ID z linii invoice; jezeli brak — z profilu (cache).
  const lineItem = invoice.lines?.data?.[0];
  const rawPrice = lineItem?.pricing?.price_details?.price;
  // Stripe SDK typuje price jako `string | Price`; nas interesuje sam ID.
  const linePriceId =
    typeof rawPrice === "string" ? rawPrice : (rawPrice?.id ?? null);
  const priceId =
    linePriceId ??
    (profile.stripe_subscription_price_id as string | null) ??
    null;

  const proTier = priceId ? getProTierByPriceId(priceId) : undefined;
  const product = priceId ? getProductByPriceId(priceId) : undefined;
  const monthlyCredits = proTier?.credits ?? product?.points ?? 0;

  if (monthlyCredits > 0) {
    await supabase.rpc("add_points", {
      p_user_id: profile.id,
      amount: monthlyCredits,
    });
    await supabase
      .from("profiles")
      .update({
        monthly_credits_used: 0,
        monthly_credits_reset_at: new Date().toISOString(),
        daily_credits_used: 0,
        daily_credits_reset_at: new Date().toISOString(),
      })
      .eq("id", profile.id);
  }

  // Program polecen: jezeli to PIERWSZA platnosc referee, naliczamy reward
  // dla referrera (300 kredytow).
  await maybeAwardReferralReward(supabase, profile.id);
}

/**
 * Sprawdza czy user (referee) jest oznaczony w tabeli `referrals` i czy reward
 * jeszcze nie zostal naliczony. Jezeli tak — naliczamy 300 kredytow referrerowi.
 */
async function maybeAwardReferralReward(
  supabase: ReturnType<typeof getServiceClient>,
  refereeId: string,
) {
  const REWARD_CREDITS = 300;

  const { data: referral } = await supabase
    .from("referrals")
    .select("id, referrer_id, awarded_at")
    .eq("referee_id", refereeId)
    .maybeSingle();

  if (!referral) return;
  if (referral.awarded_at) return; // juz naliczone

  await supabase.rpc("add_points", {
    p_user_id: referral.referrer_id,
    amount: REWARD_CREDITS,
  });

  await supabase
    .from("referrals")
    .update({
      reward_credits: REWARD_CREDITS,
      awarded_at: new Date().toISOString(),
      referee_first_payment_at: new Date().toISOString(),
    })
    .eq("id", referral.id);
}

// Kept for backward compat
export function getProductByPriceIdAlias(priceId: string) {
  return getProductByPriceId(priceId);
}
