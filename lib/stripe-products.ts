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
  // ─── One-time top-up packs (dostepne dla wszystkich tierow) ────────────────
  {
    id: "pack_1000",
    name: "Doladowanie 1000",
    description: "1 000 kredytow — jednorazowo. Bez subskrypcji.",
    kind: "topup",
    points: 1000,
    amountCents: 1900,
    currency: "pln",
    stripePriceId: process.env.STRIPE_PRICE_PACK_1000 ?? "price_REPLACE_ME_1000",
  },
  {
    id: "pack_5000",
    name: "Doladowanie 5000",
    description: "5 000 kredytow — jednorazowo. Bez subskrypcji.",
    kind: "topup",
    points: 5000,
    amountCents: 7900,
    currency: "pln",
    stripePriceId: process.env.STRIPE_PRICE_PACK_5000 ?? "price_REPLACE_ME_5000",
  },
  {
    id: "pack_15000",
    name: "Doladowanie 15000",
    description: "15 000 kredytow — jednorazowo. Bez subskrypcji.",
    kind: "topup",
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
