/**
 * Stripe products — JEDNA subskrypcja PRO ze sliderem.
 *
 * Konwencja:
 *  - 8 poziomow miesiecznych kredytow → 8 stalych Stripe Price ID (kazdy jako
 *    rekurencyjna subskrypcja miesieczna w PLN).
 *  - Brak one-time topupow (decyzja produktowa: tylko subskrypcje, anty-abuse).
 *  - Ceny PODANE BRUTTO. Stripe Tax (jezeli wlaczony) nalicza VAT z PLN; jezeli
 *    sprzedawca nie jest VAT-owcem, podana cena to faktyczna kwota pobierana.
 *
 * UWAGA: stripePriceId musi byc zastapione realnym ID z Dashboard Stripe.
 *
 * ─── ADR: PLN-only (audyt produkcji items 24, 26) ────────────────────────
 * Decyzja produktowa: nie obsługujemy USD/EUR ani mid-cycle downgrade proration.
 *
 * PLN-only powody:
 *  - Target rynek: Polska. 99% userów chce PLN.
 *  - Brak VAT EU-OSS w MVP - faktury w EUR/USD wymagałyby dodatkowej
 *    konfiguracji księgowej (rejestracja w OSS, sprawozdania zagraniczne).
 *  - Stripe checkout sam pokazuje konwersję na walutę kraju karty.
 *
 * Brak mid-cycle proration:
 *  - Downgrade: user płaci za bieżący okres (pełna kwota), zmiana wchodzi
 *    od następnego cyklu. Stripe nie zwraca pieniędzy.
 *  - Upgrade: standardowa Stripe proration (kwota różnicy doliczona do
 *    następnej faktury) - już obsługiwana.
 *
 * Jeśli kiedyś dodasz EUR/USD: zmień typ `currency` na enum + zaktualizuj
 * PRORATION_HINT w pricing-client.tsx (FX disclosure).
 * ─────────────────────────────────────────────────────────────────────────
 */

export type StripeProductKind = "subscription";

export type StripeProduct = {
  id: string;
  name: string;
  description: string;
  kind: StripeProductKind;
  /** Liczba kredytow dodawana miesiecznie po platnosci subskrypcji. */
  points: number;
  /** Cena w groszach (PLN). */
  amountCents: number;
  currency: "pln" | "eur" | "usd";
  /** Stripe Price ID z Dashboard Stripe. */
  stripePriceId: string;
  /** Plan robi z usera tier='pro'. */
  tier?: "free" | "pro";
  features?: string[];
  highlight?: boolean;
};

/** 1 PLN = ile kredytów (bazowa wycena dla wyswietlania w UI). */
export const CREDITS_PER_PLN = 50;

/**
 * 8 poziomow PRO. UWAGA: kazdy poziom = osobny Stripe Price ID, ale wszystkie
 * sa tym samym produktem 'plan_pro' dla logiki tier-changeu w webhooku.
 */
export type ProTier = {
  id: string;
  credits: number;
  pln: number;
  stripePriceId: string;
};

export const PRO_TIERS: ProTier[] = [
  {
    id: "pro_500",
    credits: 500,
    pln: 39,
    stripePriceId: process.env.STRIPE_PRICE_PRO_500 ?? "price_REPLACE_ME_PRO_500",
  },
  {
    id: "pro_1500",
    credits: 1500,
    pln: 79,
    stripePriceId: process.env.STRIPE_PRICE_PRO_1500 ?? "price_REPLACE_ME_PRO_1500",
  },
  {
    id: "pro_3000",
    credits: 3000,
    pln: 139,
    stripePriceId: process.env.STRIPE_PRICE_PRO_3000 ?? "price_REPLACE_ME_PRO_3000",
  },
  {
    id: "pro_6000",
    credits: 6000,
    pln: 249,
    stripePriceId: process.env.STRIPE_PRICE_PRO_6000 ?? "price_REPLACE_ME_PRO_6000",
  },
  {
    id: "pro_12000",
    credits: 12000,
    pln: 449,
    stripePriceId: process.env.STRIPE_PRICE_PRO_12000 ?? "price_REPLACE_ME_PRO_12000",
  },
  {
    id: "pro_24000",
    credits: 24000,
    pln: 799,
    stripePriceId: process.env.STRIPE_PRICE_PRO_24000 ?? "price_REPLACE_ME_PRO_24000",
  },
  {
    id: "pro_48000",
    credits: 48000,
    pln: 1499,
    stripePriceId: process.env.STRIPE_PRICE_PRO_48000 ?? "price_REPLACE_ME_PRO_48000",
  },
  {
    id: "pro_96000",
    credits: 96000,
    pln: 2799,
    stripePriceId:
      process.env.STRIPE_PRICE_PRO_96000 ?? "price_REPLACE_ME_PRO_96000",
  },
];

/** Default tier wyswietlany jako "polecany" w UI (psychologia: 2. od dolu). */
export const RECOMMENDED_PRO_TIER_ID = "pro_1500";

export function getProTierById(id: string): ProTier | undefined {
  return PRO_TIERS.find((t) => t.id === id);
}

export function getProTierByCredits(credits: number): ProTier | undefined {
  return PRO_TIERS.find((t) => t.credits === credits);
}

export function getProTierByPriceId(priceId: string): ProTier | undefined {
  return PRO_TIERS.find((t) => t.stripePriceId === priceId);
}

/**
 * Lista wszystkich produktow w katalogu — dla webhooka i checkoutu.
 * Wszystkie sa subskrypcjami PRO; rozni je tylko liczba kredytow i cena.
 */
export const STRIPE_PRODUCTS: StripeProduct[] = PRO_TIERS.map((tier) => ({
  id: tier.id,
  name: `PRO — ${tier.credits.toLocaleString("pl-PL")} kr/mc`,
  description: `${tier.credits.toLocaleString("pl-PL")} kredytów miesięcznie. Cena brutto za miesiąc.`,
  kind: "subscription" as const,
  tier: "pro" as const,
  points: tier.credits,
  amountCents: tier.pln * 100,
  currency: "pln" as const,
  stripePriceId: tier.stripePriceId,
  highlight: tier.id === RECOMMENDED_PRO_TIER_ID,
  features: [
    `${tier.credits.toLocaleString("pl-PL")} kredytów miesięcznie`,
    "Modele Sonnet 4.6, Opus 4.6 i Opus 4.7",
    "Custom subdomena (slug.wybitny.website)",
    "Projekty prywatne",
    "Eksport ZIP i push do GitHub",
    "Integracje Supabase/Notion/Stripe",
    "Priorytetowy support",
  ],
}));

export function getProductById(id: string): StripeProduct | undefined {
  return STRIPE_PRODUCTS.find((p) => p.id === id);
}

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return STRIPE_PRODUCTS.find((p) => p.stripePriceId === priceId);
}

export function getSubscriptions(): StripeProduct[] {
  return STRIPE_PRODUCTS;
}

/** Legacy: zostawione jako pusta lista — kompatybilnosc z UI. Topupy usuniete. */
export function getTopupPacks(): StripeProduct[] {
  return [];
}

export function formatAmount(amountCents: number, currency: string): string {
  return (amountCents / 100).toLocaleString("pl-PL", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
}
