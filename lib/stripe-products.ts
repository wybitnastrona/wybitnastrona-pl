/**
 * Stripe products i pakiety punktow.
 *
 * UWAGA: stripePriceId musi byc zastapione realnym ID z Dashboard Stripe.
 * Po stworzeniu produktow w Dashboard, podstaw te ID albo przenies je do ENV
 * (STRIPE_PRICE_PACK_1000, etc.).
 */

export type PackageType = "topup" | "subscription";

export type StripeProduct = {
  id: string;
  type: PackageType;
  name: string;
  description: string;
  /** Liczba punktow dodawana po platnosci (jednorazowo lub miesiecznie). */
  points: number;
  /** Cena w groszach/centach. */
  amountCents: number;
  currency: "pln" | "eur" | "usd";
  /** Stripe Price ID — wstaw realne ID z Dashboard Stripe. */
  stripePriceId: string;
  /** Subskrypcyjny tier (tylko dla type='subscription'). */
  tier?: "pro" | "team";
  /** Cykl rozliczeniowy (tylko dla subskrypcji). */
  interval?: "month" | "year";
};

export const STRIPE_PRODUCTS: StripeProduct[] = [
  // Pakiety jednorazowe (top-up)
  {
    id: "pack_1000",
    type: "topup",
    name: "Pakiet Starter",
    description: "1 000 punktow — okolo 100 zapytan Sonnet 4.6",
    points: 1000,
    amountCents: 1900,
    currency: "pln",
    stripePriceId: process.env.STRIPE_PRICE_PACK_1000 ?? "price_REPLACE_ME_1000",
  },
  {
    id: "pack_5000",
    type: "topup",
    name: "Pakiet Pro",
    description: "5 000 punktow — okolo 500 zapytan Sonnet 4.6",
    points: 5000,
    amountCents: 7900,
    currency: "pln",
    stripePriceId: process.env.STRIPE_PRICE_PACK_5000 ?? "price_REPLACE_ME_5000",
  },
  {
    id: "pack_15000",
    type: "topup",
    name: "Pakiet Premium",
    description: "15 000 punktow — okolo 1500 zapytan Sonnet 4.6",
    points: 15000,
    amountCents: 19900,
    currency: "pln",
    stripePriceId: process.env.STRIPE_PRICE_PACK_15000 ?? "price_REPLACE_ME_15000",
  },

  // Subskrypcje miesieczne
  {
    id: "sub_pro",
    type: "subscription",
    name: "Subskrypcja Pro",
    description: "5 000 punktow co miesiac + dostep do Opus + priorytet",
    points: 5000,
    amountCents: 4900,
    currency: "pln",
    stripePriceId: process.env.STRIPE_PRICE_SUB_PRO ?? "price_REPLACE_ME_SUB_PRO",
    tier: "pro",
    interval: "month",
  },
  {
    id: "sub_team",
    type: "subscription",
    name: "Subskrypcja Team",
    description:
      "20 000 punktow co miesiac + wspolpraca + custom domeny + priorytetowy support",
    points: 20000,
    amountCents: 14900,
    currency: "pln",
    stripePriceId: process.env.STRIPE_PRICE_SUB_TEAM ?? "price_REPLACE_ME_SUB_TEAM",
    tier: "team",
    interval: "month",
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
