"use client";

import { useState } from "react";
import { CheckCircle2, Edit2, ListTodo, Save, SkipForward, X } from "lucide-react";

type Props = {
  steps: string[];
  /** If true, the plan has already been acted on (Approved/Skipped). */
  consumed?: boolean;
  /**
   * Called when the user approves the plan (possibly after editing).
   * Receives the final list of steps — may differ from the original if edited.
   */
  onApprove: (finalSteps: string[]) => void;
  onSkip: () => void;
};

export function PlanCard({ steps, consumed = false, onApprove, onSkip }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  // Editing buffer: one step per line
  const [editText, setEditText] = useState(() => steps.join("\n"));
  // Live steps — updated when user saves edits
  const [currentSteps, setCurrentSteps] = useState<string[]>(steps);

  function handleEditStart() {
    setEditText(currentSteps.join("\n"));
    setIsEditing(true);
  }

  function handleSave() {
    const parsed = editText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    setCurrentSteps(parsed);
    setIsEditing(false);
  }

  function handleCancel() {
    setEditText(currentSteps.join("\n"));
    setIsEditing(false);
  }

  return (
    <div className="my-2 w-full max-w-sm rounded-xl border border-beige/20 bg-card/80 p-4 shadow-md">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <ListTodo className="h-4 w-4 text-beige/70" />
        <h3 className="text-sm font-medium text-foreground">Plan implementacji</h3>
        {!consumed && !isEditing && (
          <button
            type="button"
            onClick={handleEditStart}
            className="ml-auto flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground transition hover:text-beige"
            title="Edytuj kroki planu"
          >
            <Edit2 className="h-3 w-3" />
            Edytuj
          </button>
        )}
      </div>

      {/* View mode */}
      {!isEditing && (
        <ol
          className={`mb-4 space-y-1.5 transition-all duration-200 ${isEditing ? "opacity-0" : "opacity-100"}`}
        >
          {currentSteps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-beige/15 text-[9px] font-medium text-beige">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      )}

      {/* Edit mode */}
      {isEditing && (
        <div className="mb-3 transition-all duration-200">
          <p className="mb-1.5 text-[11px] text-muted-foreground">
            Jeden krok w każdej linii. Usuń, zmień lub dodaj kroki.
          </p>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={Math.max(4, currentSteps.length + 1)}
            className="w-full resize-none rounded-lg border border-beige/25 bg-background/60 px-3 py-2 text-xs text-foreground leading-relaxed focus:border-beige/50 focus:outline-none"
            autoFocus
          />
        </div>
      )}

      {/* Buttons */}
      {!consumed && !isEditing && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onApprove(currentSteps)}
            className="flex h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-beige text-xs font-medium text-beige-foreground transition hover:bg-beige/90"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Zatwierdź i buduj
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="flex h-7 cursor-pointer items-center gap-1 rounded-lg border border-beige/20 px-2.5 text-xs text-muted-foreground transition hover:border-beige/40 hover:text-foreground"
          >
            <SkipForward className="h-3 w-3" />
            Pomiń
          </button>
        </div>
      )}

      {isEditing && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-beige text-xs font-medium text-beige-foreground transition hover:bg-beige/90"
          >
            <Save className="h-3.5 w-3.5" />
            Zapisz zmiany
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex h-7 cursor-pointer items-center gap-1 rounded-lg border border-beige/20 px-2.5 text-xs text-muted-foreground transition hover:border-beige/40 hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Anuluj
          </button>
        </div>
      )}

      {consumed && (
        <p className="flex items-center gap-1.5 text-xs text-beige/70">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Plan zatwierdzony
        </p>
      )}
    </div>
  );
}
