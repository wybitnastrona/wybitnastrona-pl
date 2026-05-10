/**
 * Modele AI dostepne w kreatorze.
 * pointCost: koszt jednego zapytania do AI w punktach uzytkownika.
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
  /** Koszt jednego zapytania w punktach uzytkownika. */
  pointCost: number;
  available: boolean;
  /** Jezeli true — model wymaga planu Pro lub Team (niedostepny w Free). */
  requiresPro?: boolean;
};

export const AI_MODELS: AiModelDef[] = [
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    labelShort: "Haiku 4.5",
    anthropicModel: "claude-haiku-4-5",
    description: "Najszybszy model. Idealny do prostych zmian i iteracji.",
    badge: "fast",
    pointCost: 10,
    available: true,
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    labelShort: "Sonnet 4.6",
    anthropicModel: "claude-sonnet-4-5",
    description: "Najlepszy balans szybkosci i jakosci kodu. Wymaga planu Pro.",
    pointCost: 25,
    available: true,
    requiresPro: true,
  },
  {
    id: "claude-opus-4-6",
    label: "Claude Opus 4.6",
    labelShort: "Opus 4.6",
    anthropicModel: "claude-opus-4-5",
    description:
      "Zaawansowane projekty, refaktoring architektury. Wymaga planu Pro.",
    badge: "powerful",
    pointCost: 60,
    available: true,
    requiresPro: true,
  },
  {
    id: "claude-opus-4-7",
    label: "Claude Opus 4.7",
    labelShort: "Opus 4.7",
    anthropicModel: "claude-opus-4-5",
    description:
      "Maksymalna jakosc na zlozonych zadaniach. Wymaga planu Pro.",
    badge: "new",
    pointCost: 80,
    available: true,
    requiresPro: true,
  },
];

/** Domyslny model — Haiku 4.5 dostepny dla wszystkich planow (w tym Free). */
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
