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

export const AI_MODELS: AiModelDef[] = [
  {
    id: "claude-haiku-4-5",
    label: "Auto (Claude Haiku 4.5)",
    labelShort: "Auto",
    anthropicModel: "claude-haiku-4-5",
    description:
      "Domyslny model dla planu FREE. Najszybszy, dobry do prostych zmian. 10 kredytow / generacja.",
    badge: "fast",
    pointCost: 10,
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
      "Plan PRO. Najlepszy balans szybkosci i jakosci kodu. 25 kredytow / generacja.",
    pointCost: 25,
    available: true,
    requiresTier: "pro",
  },
  {
    id: "claude-opus-4-6",
    label: "Claude Opus 4.6",
    labelShort: "Opus 4.6",
    anthropicModel: "claude-opus-4-5",
    description:
      "Plan PRO. Zaawansowane projekty, refaktoring architektury. 60 kredytow / generacja.",
    badge: "powerful",
    pointCost: 60,
    available: true,
    requiresTier: "pro",
  },
  {
    id: "claude-opus-4-7",
    label: "Claude Opus 4.7",
    labelShort: "Opus 4.7",
    anthropicModel: "claude-opus-4-5",
    description:
      "Plan WYBITNY. Maksymalna jakosc na zlozonych zadaniach, native Apple stack. 80 kredytow / generacja.",
    badge: "new",
    pointCost: 80,
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
