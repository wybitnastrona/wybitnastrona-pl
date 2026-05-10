/**
 * Stripe products — pakiety kredytow (one-time top-up).
 *
 * UWAGA: stripePriceId musi byc zastapione realnym ID z Dashboard Stripe.
 * Po stworzeniu produktow w Dashboard, podstaw te ID albo przenies je do ENV
 * (STRIPE_PRICE_PACK_1000, etc.).
 */

export type StripeProduct = {
  id: string;
  name: string;
  description: string;
  /** Liczba kredytow dodawana po platnosci. */
  points: number;
  /** Cena w groszach/centach. */
  amountCents: number;
  currency: "pln" | "eur" | "usd";
  /** Stripe Price ID — wstaw realne ID z Dashboard Stripe. */
  stripePriceId: string;
};

export const STRIPE_PRODUCTS: StripeProduct[] = [
  {
    id: "pack_1000",
    name: "Pakiet Starter",
    description: "1 000 kredytow — okolo 100 generacji Haiku 4.5",
    points: 1000,
    amountCents: 1900,
    currency: "pln",
    stripePriceId: process.env.STRIPE_PRICE_PACK_1000 ?? "price_REPLACE_ME_1000",
  },
  {
    id: "pack_5000",
    name: "Pakiet Pro",
    description: "5 000 kredytow — okolo 200 generacji Sonnet 4.6",
    points: 5000,
    amountCents: 7900,
    currency: "pln",
    stripePriceId: process.env.STRIPE_PRICE_PACK_5000 ?? "price_REPLACE_ME_5000",
  },
  {
    id: "pack_15000",
    name: "Pakiet Premium",
    description: "15 000 kredytow — okolo 187 generacji Opus 4.7",
    points: 15000,
    amountCents: 19900,
    currency: "pln",
    stripePriceId: process.env.STRIPE_PRICE_PACK_15000 ?? "price_REPLACE_ME_15000",
  },
];

export function getProductById(id: string): StripeProduct | undefined {
  return STRIPE_PRODUCTS.find((p) => p.id === id);
}

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return STRIPE_PRODUCTS.find((p) => p.stripePriceId === priceId);
}

export function formatAmount(amountCents: number, currency: string): string {
  return (amountCents / 100).toLocaleString("pl-PL", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
}
