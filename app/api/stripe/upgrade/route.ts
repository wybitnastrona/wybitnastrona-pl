import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getProductById, getProTierById } from "@/lib/stripe-products";

export const runtime = "nodejs";

/**
 * POST /api/stripe/upgrade
 * body: { newProductId: string }
 *
 * Upgrade aktywnej subskrypcji uzytkownika na wyzszy plan z proration:
 *
 *   stripe.subscriptions.update(subId, {
 *     items: [{ id: itemId, price: newPriceId }],
 *     proration_behavior: "create_prorations"
 *   });
 *
 * Stripe automatycznie zaliczy niewykorzystane dni starego planu na poczet
 * nowego. Anti-abuse: NIE cancelujemy subskrypcji ani nie tworzymy nowej —
 * proration jest liczone na zywym subscription objekcie po stronie Stripe,
 * wiec user nie moze "cancelnac" i ponownie "kupic" za 0 zl.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { newProductId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const newProductId = (body.newProductId ?? "").trim();
  if (!newProductId) {
    return NextResponse.json(
      { error: "Wymagane: newProductId" },
      { status: 400 },
    );
  }

  // Akceptujemy zarowno productId jak i ProTier id.
  let product = getProductById(newProductId);
  if (!product) {
    const tier = getProTierById(newProductId);
    if (tier) product = getProductById(tier.id);
  }
  if (!product || product.kind !== "subscription") {
    return NextResponse.json(
      { error: "Nieznany lub niesubskrypcyjny produkt" },
      { status: 400 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      {
        error: "no_subscription",
        message:
          "Nie znaleziono klienta Stripe — kup najpierw plan przez /pricing.",
      },
      { status: 400 },
    );
  }

  const stripe = getStripe();

  // Szukamy aktywnej subskrypcji uzytkownika.
  const subs = await stripe.subscriptions.list({
    customer: profile.stripe_customer_id,
    status: "active",
    limit: 1,
  });
  const sub = subs.data[0];
  if (!sub) {
    return NextResponse.json(
      {
        error: "no_active_subscription",
        message:
          "Nie masz aktywnej subskrypcji do zaktualizowania. Kup plan przez /pricing.",
      },
      { status: 400 },
    );
  }

  const currentItem = sub.items.data[0];
  if (!currentItem) {
    return NextResponse.json(
      { error: "invalid_subscription_state" },
      { status: 500 },
    );
  }

  // Update z proration — Stripe samo liczy ile dni starego planu zostalo
  // wykorzystane i kredytuje uzytkownikowi pozostala kwote na poczet nowego
  // planu. `create_prorations` daje natychmiastowa korekte na invoice.
  const updated = await stripe.subscriptions.update(sub.id, {
    items: [
      {
        id: currentItem.id,
        price: product.stripePriceId,
      },
    ],
    proration_behavior: "create_prorations",
    metadata: {
      ...(sub.metadata ?? {}),
      user_id: user.id,
      product_id: product.id,
      tier: product.tier ?? "",
    },
  });

  return NextResponse.json({
    ok: true,
    subscriptionId: updated.id,
    productId: product.id,
    status: updated.status,
  });
}
