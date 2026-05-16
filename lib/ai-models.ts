/**
 * Modele AI dostepne w kreatorze.
 * pointCost: koszt jednego zapytania do AI w kredytach uzytkownika.
 *
 * Tiers po refaktorze: tylko 'free' i 'pro'. Wybitny zostal zwiniety do PRO.
 */

export type AiModelId =
  | "claude-haiku-4-5"
  | "claude-sonnet-4-6"
  | "claude-opus-4-6"
  | "claude-opus-4-7";

export type AiModelDef = {
  id: AiModelId;
  /** Etykieta widoczna w UI. */
  label: string;
  /** Krotka etykieta w dropdownie / toolbarze. */
  labelShort: string;
  /** Display name uzywany w chacie/kreatorze ("Pan Programista" dla Sonneta). */
  displayName?: string;
  /** Rzeczywisty identyfikator modelu w API Anthropic. */
  anthropicModel: string;
  description: string;
  badge?: "new" | "fast" | "powerful";
  /** Koszt jednego zapytania w kredytach uzytkownika. */
  pointCost: number;
  available: boolean;
  /** Minimalny tier ktorego uzywa: free / pro. */
  requiresTier: "free" | "pro";
  /** @deprecated zastapione przez requiresTier === 'free'. */
  isFree?: boolean;
};

/**
 * Przelicznik kredytów na PLN (target ~8x markup na planie 39 PLN):
 *
 * 1 kredyt = 0.02 PLN
 *
 * Rzeczywisty koszt Anthropic API per generacja (estymata realnego ruchu —
 * ~15K in / 4K out dla buildu, ~10K in / 2K out dla edycji):
 *  Sonnet 4.6 build:  ~$0.105 = ~0.42 PLN → 8x = 3.36 PLN → 60 kredytów (~21 base)
 *  Sonnet 4.6 edit:   ~$0.060 = ~0.24 PLN → 8x = 1.92 PLN → 30 kredytów
 *  Haiku 4.5 edit:    ~$0.016 = ~0.064 PLN → 8x = 0.51 PLN → 8 kredytów
 *  Opus 4.6 build:    ~$0.150 = ~0.60 PLN → 8x = 4.80 PLN → 150 kredytów
 *  Opus 4.7 edit:     ~$0.300 = ~1.20 PLN → 8x = 9.60 PLN → 300 kredytów
 *
 * Po przeliczeniu:
 *  - Plan 39 PLN / 500 kr   = ~8x markup (2-3 buildy + edycje miesiecznie).
 *  - Plan 2799 PLN / 96000 kr = ~5x markup przy wysokim wolumenie.
 *
 * Wartosci `pointCost` ponizej to koszt jednej generacji modelu (build OR
 * najczestsza edycja — UI najczesciej uzywa modelu w trybie edycji, dlatego
 * koszt jest zblizony do edit-tier zeby user-experience byl tani).
 */
export const CREDITS_PER_PLN = 50; // 1 PLN = 50 kredytów → 1 kredyt = 0.02 PLN

/**
 * Limity FREE tier — rate-limit zachecajacy do PRO.
 * monthlyCredits=1500 = 1 generacja Sonnet (240) + kilka poprawek Sonnet/Haiku/discuss.
 * dailyCredits=800 = max ~3 generacje Sonnet lub kilkanaście Haiku w jednej sesji.
 * Reset realizowany przez RPC bump_usage_counters (atomicznie).
 */
export const FREE_TIER_LIMITS = {
  monthlyCredits: 1500,
  dailyCredits: 800,
} as const;

export const AI_MODELS: AiModelDef[] = [
  {
    id: "claude-sonnet-4-6",
    label: "Pan Programista (Sonnet 4.6)",
    labelShort: "Pan Programista",
    displayName: "Pan Programista",
    // Anthropic API id: na razie sonnet-4-5 (najnowszy GA). Aktualizujemy gdy
    // 4.6 trafi do produkcji.
    anthropicModel: "claude-sonnet-4-5",
    description:
      "Domyślny — najlepszy stosunek jakości do kosztu. Koszt: 60 kr (≈ 1,20 zł) za generację.",
    badge: "powerful",
    // Markup ~8x na koszt API (~0.42 PLN build, ~0.24 PLN edit). Stary pointCost
    // 240 byl ~12x dla 39 PLN plan — obnizone do 60 zeby plan 39 zl mial sens.
    pointCost: 60,
    available: true,
    requiresTier: "free",
    isFree: true,
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5 (szybki)",
    labelShort: "Szybki",
    anthropicModel: "claude-haiku-4-5",
    description:
      "Budżet — szybkie, drobne poprawki. Koszt: 8 kr (≈ 0,16 zł) za generację.",
    badge: "fast",
    // Haiku jest tanszy ~5x niz Sonnet w API; markup ~8x daje 8 kr.
    pointCost: 8,
    available: true,
    requiresTier: "free",
    isFree: true,
  },
  {
    id: "claude-opus-4-6",
    label: "Claude Opus 4.6",
    labelShort: "Opus 4.6",
    anthropicModel: "claude-opus-4-5",
    description:
      "Refaktoryzacja architektury, złożona logika biznesowa. Koszt: 150 kr (≈ 3,00 zł) za generację. Wymaga planu PRO.",
    badge: "powerful",
    // Opus 4.6 jest ~2.5x drozszy niz Sonnet; markup ~8x daje 150 kr.
    pointCost: 150,
    available: true,
    requiresTier: "pro",
  },
  {
    id: "claude-opus-4-7",
    label: "Claude Opus 4.7",
    labelShort: "Opus 4.7",
    // Najwyzszy tier Opusa — gdy Anthropic wypusci 4-6/4-7 zaktualizujemy ten ID.
    anthropicModel: "claude-opus-4-5",
    description:
      "Maksymalna jakość. Natywne aplikacje Apple (ARKit, HealthKit, Metal). Koszt: 300 kr (≈ 6,00 zł) za generację. Wymaga planu PRO.",
    badge: "new",
    // Opus 4.7 ~5x drozszy niz Sonnet; markup ~8x daje 300 kr.
    pointCost: 300,
    available: true,
    requiresTier: "pro",
  },
];

// ─── Tier helpers ─────────────────────────────────────────────────────────────

export type UserTier = "free" | "pro";

const TIER_RANK: Record<UserTier, number> = {
  free: 0,
  pro: 1,
};

/** Czy `userTier` jest >= `minTier`? */
export function tierAllows(
  userTier: UserTier | string | undefined,
  minTier: UserTier,
): boolean {
  const u = (userTier as UserTier) ?? "free";
  if (!(u in TIER_RANK)) return false;
  return TIER_RANK[u] >= TIER_RANK[minTier];
}

/** Modele dostepne dla danego tieru. */
export function availableModelsForTier(
  userTier: UserTier | string | undefined,
): AiModelDef[] {
  return AI_MODELS.filter(
    (m) => m.available && tierAllows(userTier, m.requiresTier),
  );
}

/** Domyslny model — Sonnet 4.6 ("Pan Programista") dostepny dla wszystkich (FREE tez). */
export const DEFAULT_MODEL_ID: AiModelId = "claude-sonnet-4-6";

export function getModel(id: AiModelId | string | undefined): AiModelDef {
  return (
    AI_MODELS.find((m) => m.id === id) ??
    AI_MODELS.find((m) => m.id === DEFAULT_MODEL_ID)!
  );
}

export function resolveAnthropicModel(
  id: AiModelId | string | undefined,
): string {
  return getModel(id).anthropicModel;
}
