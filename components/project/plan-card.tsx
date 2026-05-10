"use client";

import { CheckCircle2, Edit2, ListTodo, SkipForward } from "lucide-react";

type Props = {
  steps: string[];
  /** If true, the plan has already been acted on (Approved/Skipped). */
  consumed?: boolean;
  onApprove: () => void;
  onEdit: () => void;
  onSkip: () => void;
};

export function PlanCard({
  steps,
  consumed = false,
  onApprove,
  onEdit,
  onSkip,
}: Props) {
  return (
    <div className="my-2 w-full max-w-sm rounded-xl border border-beige/20 bg-card/80 p-4 shadow-md">
      <div className="mb-3 flex items-center gap-2">
        <ListTodo className="h-4 w-4 text-beige/70" />
        <h3 className="text-sm font-medium text-foreground">Plan implementacji</h3>
      </div>

      <ol className="mb-4 space-y-1.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-beige/15 text-[9px] font-medium text-beige">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      {!consumed && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onApprove}
            className="flex h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-beige text-xs font-medium text-beige-foreground transition hover:bg-beige/90"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Zatwierdź
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="flex h-7 cursor-pointer items-center gap-1 rounded-lg border border-beige/20 px-2.5 text-xs text-muted-foreground transition hover:border-beige/40 hover:text-foreground"
          >
            <Edit2 className="h-3 w-3" />
            Edytuj
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

      {consumed && (
        <p className="flex items-center gap-1.5 text-xs text-beige/70">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Plan zatwierdzony
        </p>
      )}
    </div>
  );
}
