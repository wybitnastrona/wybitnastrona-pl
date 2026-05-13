/**
 * Stripe products — pakiety kredytow (one-time top-up) + subskrypcje PRO/WYBITNY.
 *
 * UWAGA: stripePriceId musi byc zastapione realnym ID z Dashboard Stripe.
 * Po stworzeniu produktow w Dashboard, podstaw te ID albo przenies je do ENV.
 */

export type StripeProductKind = "topup" | "subscription";

export type StripeProduct = {
  id: string;
  name: string;
  description: string;
  /** Typ produktu: jednorazowy zakup kredytow vs miesieczna subskrypcja. */
  kind: StripeProductKind;
  /** Liczba kredytow dodawana po platnosci (topup) lub odnawialna miesiecznie (subscription). */
  points: number;
  /** Cena w groszach/centach. */
  amountCents: number;
  currency: "pln" | "eur" | "usd";
  /** Stripe Price ID — wstaw realne ID z Dashboard Stripe. */
  stripePriceId: string;
  /** Dla subskrypcji: jakim tier robi ze uzytkownika ten produkt. */
  tier?: "free" | "pro" | "wybitny";
  /** Marketingowe highlights wyswietlane w pricing UI. */
  features?: string[];
  /** Plan flagowy — wyrozniony wizualnie. */
  highlight?: boolean;
};

/** 1 PLN = ile kredytów */
export const CREDITS_PER_PLN = 50;

export const STRIPE_PRODUCTS: StripeProduct[] = [
  // ─── Subscriptions ──────────────────────────────────────────────────────────
  {
    id: "plan_pro",
    name: "PRO",
    description: "Profesjonalne tworzenie aplikacji web, Android i iOS.",
    kind: "subscription",
    tier: "pro",
    points: 500,
    amountCents: 8000, // 20 USD = ~80 PLN (przyklad — dostosuj)
    currency: "pln",
    stripePriceId: process.env.STRIPE_PRICE_PLAN_PRO ?? "price_REPLACE_ME_PRO",
    highlight: true,
    features: [
      "Wszystkie platformy: Web, Android (Kotlin), iOS (Swift)",
      "500 kredytow / miesiac",
      "Modele Claude Sonnet 4.6 i Opus 4.6",
      "Projekty prywatne",
      "Eksport ZIP do Xcode / Android Studio",
      "Submission Wizard (TestFlight, Google Play)",
    ],
  },
  {
    id: "plan_wybitny",
    name: "WYBITNY",
    description:
      "Najbardziej zaawansowane AI do budowania aplikacji Apple. Watch, TV, Vision Pro, ARKit, HealthKit, Metal.",
    kind: "subscription",
    tier: "wybitny",
    points: 5000,
    amountCents: 79900, // ~799 PLN/mc
    currency: "pln",
    stripePriceId:
      process.env.STRIPE_PRICE_PLAN_WYBITNY ?? "price_REPLACE_ME_WYBITNY",
    features: [
      "Wszystkie platformy Apple: iPhone, iPad, Watch, TV, Vision Pro",
      "5 000 kredytow / miesiac",
      "Model Claude Opus 4.7 (top-tier reasoning)",
      "Tryb MAX APPLE POWER: ARKit, HealthKit, Metal, Live Activities, App Intents",
      "Real-time TestFlight submission tracking",
      "Custom System Context per projekt",
      "Priorytetowe wsparcie",
    ],
  },
  // ─── One-time top-up packs ─────────────────────────────────────────────────
  // 1 kredyt = 0.02 PLN (1 PLN = 50 kredytów)
  // Pakiety: lekka zniżka przy większych zakupach (bonus kredytów)
  {
    id: "pack_500",
    name: "Starter — 500 kr",
    description: "500 kredytów = 8 generacji Haiku. 1 generacja Sonnet.",
    kind: "topup",
    points: 500,
    amountCents: 990,  // 9.90 PLN
    currency: "pln",
    stripePriceId: process.env.STRIPE_PRICE_PACK_500 ?? "price_REPLACE_ME_500",
    features: ["500 kredytów", "≈ 8 generacji Auto", "Nie wygasają"],
  },
  {
    id: "pack_2000",
    name: "Basic — 2 000 kr",
    description: "2 000 kredytów + 200 bonus = 2 200. Idealny start z Sonnetem.",
    kind: "topup",
    points: 2200,
    amountCents: 3900,  // 39.00 PLN → oszczędzasz 5 PLN
    currency: "pln",
    stripePriceId: process.env.STRIPE_PRICE_PACK_2000 ?? "price_REPLACE_ME_2000",
    features: ["2 200 kredytów (+200 bonus)", "≈ 9 generacji Sonnet", "Nie wygasają"],
    highlight: true,
  },
  {
    id: "pack_10000",
    name: "Pro — 10 000 kr",
    description: "10 000 kredytów + 2 000 bonus = 12 000. Dla intensywnych twórców.",
    kind: "topup",
    points: 12000,
    amountCents: 17900,  // 179.00 PLN → oszczędzasz 21 PLN
    currency: "pln",
    stripePriceId: process.env.STRIPE_PRICE_PACK_10000 ?? "price_REPLACE_ME_10000",
    features: ["12 000 kredytów (+2 000 bonus)", "≈ 10 generacji Opus 4.7", "Nie wygasają"],
  },
];

export function getProductById(id: string): StripeProduct | undefined {
  return STRIPE_PRODUCTS.find((p) => p.id === id);
}

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return STRIPE_PRODUCTS.find((p) => p.stripePriceId === priceId);
}

export function getSubscriptions(): StripeProduct[] {
  return STRIPE_PRODUCTS.filter((p) => p.kind === "subscription");
}

export function getTopupPacks(): StripeProduct[] {
  return STRIPE_PRODUCTS.filter((p) => p.kind === "topup");
}

export function formatAmount(amountCents: number, currency: string): string {
  return (amountCents / 100).toLocaleString("pl-PL", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
}
