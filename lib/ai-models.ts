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
    id: "claude-haiku-4-5",
    label: "Auto (Claude Haiku 4.5)",
    labelShort: "Auto",
    anthropicModel: "claude-haiku-4-5",
    description:
      "Najszybszy model. Dobry do prostych zmian i stron. ≈ 60 kr / generacja (1.20 zł).",
    badge: "fast",
    pointCost: 60,
    available: true,
    requiresTier: "free",
    isFree: true,
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    labelShort: "Sonnet 4.6",
    anthropicModel: "claude-sonnet-4-5",
    description:
      "Balans jakości i szybkości. Złoty standard dla większości projektów. ≈ 240 kr / generacja (4.80 zł).",
    pointCost: 240,
    available: true,
    requiresTier: "pro",
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

/** Domyslny model — Haiku 4.5 dostepny dla wszystkich. */
export const DEFAULT_MODEL_ID: AiModelId = "claude-haiku-4-5";

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
