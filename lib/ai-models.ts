/**
 * Modele AI dostepne w kreatorze.
 * pointCost: koszt jednego zapytania do AI w kredytach uzytkownika.
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
  /** Rzeczywisty identyfikator modelu w API Anthropic. */
  anthropicModel: string;
  description: string;
  badge?: "new" | "fast" | "powerful";
  /** Koszt jednego zapytania w kredytach uzytkownika. */
  pointCost: number;
  available: boolean;
  /** Minimalny tier ktorego uzywa: free / pro / wybitny. */
  requiresTier: "free" | "pro" | "wybitny";
  /** @deprecated zastapione przez requiresTier === 'free'. */
  isFree?: boolean;
};

/**
 * Przelicznik kredytów na PLN (model 2x markup):
 *
 * 1 kredyt = 0.02 PLN
 *
 * Koszt Anthropic API per generacja (~50K tokenów łącznie):
 *  Haiku 4.5:   ~$0.15 = ~0.60 PLN → markup 2x = 1.20 PLN → 60 kredytów
 *  Sonnet 4.6:  ~$0.60 = ~2.40 PLN → markup 2x = 4.80 PLN → 240 kredytów
 *  Opus 4.6:    ~$1.50 = ~6.00 PLN → markup 2x = 12.00 PLN → 600 kredytów
 *  Opus 4.7:    ~$3.00 = ~12.00 PLN → markup 2x = 24.00 PLN → 1200 kredytów
 */
export const CREDITS_PER_PLN = 50; // 1 PLN = 50 kredytów → 1 kredyt = 0.02 PLN

export const AI_MODELS: AiModelDef[] = [
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6 (zalecany)",
    labelShort: "Sonnet 4.6",
    anthropicModel: "claude-sonnet-4-5",
    description:
      "Domyślny — najlepszy stosunek jakości do kosztu. Najczęściej wystarcza jedna generacja. ≈ 240 kr / generacja (4.80 zł).",
    badge: "powerful",
    pointCost: 240,
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
      "Tryb budżetowy — szybki, do drobnych poprawek. UWAGA: częściej wymaga ponawiania. ≈ 30 kr / generacja (0.60 zł).",
    badge: "fast",
    pointCost: 30,
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
      "Zaawansowane projekty, refaktoryzacja architektury, złożona logika. ≈ 600 kr / generacja (12.00 zł).",
    badge: "powerful",
    pointCost: 600,
    available: true,
    requiresTier: "pro",
  },
  {
    id: "claude-opus-4-7",
    label: "Claude Opus 4.7",
    labelShort: "Opus 4.7",
    anthropicModel: "claude-opus-4-5",
    description:
      "Maksymalna jakość. Natywne aplikacje Apple (ARKit, HealthKit, Metal). ≈ 1200 kr / generacja (24.00 zł).",
    badge: "new",
    pointCost: 1200,
    available: true,
    requiresTier: "wybitny",
  },
];

// ─── Tier helpers ─────────────────────────────────────────────────────────────

export type UserTier = "free" | "pro" | "wybitny";

const TIER_RANK: Record<UserTier, number> = {
  free: 0,
  pro: 1,
  wybitny: 2,
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

/** Domyslny model — Sonnet 4.6 dostepny dla wszystkich (FREE tez). */
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
