import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getOrCreateCustomer } from "@/lib/stripe";
import { getProductById } from "@/lib/stripe-products";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { productId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const product = body.productId ? getProductById(body.productId) : undefined;
  if (!product) return NextResponse.json({ error: "Unknown product" }, { status: 400 });

  // Pobierz/utworz Stripe customer
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customer = await getOrCreateCustomer(
    user.id,
    user.email ?? "",
    profile?.stripe_customer_id,
  );

  if (!profile?.stripe_customer_id) {
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customer.id })
      .eq("id", user.id);
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const isSubscription = product.kind === "subscription";
  // Subscriptions w Polsce nie wspieraja BLIK / p24 — sprawdz dostepne metody w Dashboard.
  // Topupy: full menu z BLIKiem.
  const paymentMethods: Array<"card" | "blik" | "p24"> = isSubscription
    ? ["card"]
    : ["card", "blik", "p24"];

  const session = await stripe.checkout.sessions.create({
    mode: isSubscription ? "subscription" : "payment",
    customer: customer.id,
    line_items: [{ price: product.stripePriceId, quantity: 1 }],
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing?canceled=1`,
    metadata: {
      user_id: user.id,
      product_id: product.id,
      product_kind: product.kind,
      tier: product.tier ?? "",
      points: String(product.points),
    },
    subscription_data: isSubscription
      ? {
          metadata: {
            user_id: user.id,
            product_id: product.id,
            tier: product.tier ?? "",
          },
        }
      : undefined,
    payment_method_types: paymentMethods,
    locale: "pl",
    allow_promotion_codes: true,
  });

  // Zapisujemy pending payment (zostanie zaktualizowany przez webhook)
  await supabase.from("payments").insert({
    user_id: user.id,
    stripe_session_id: session.id,
    stripe_customer_id: customer.id,
    product_id: product.id,
    amount_cents: product.amountCents,
    currency: product.currency,
    points_added: product.points,
    status: "pending",
  });

  return NextResponse.json({ url: session.url });
}
