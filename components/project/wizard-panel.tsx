"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import {
  detectIndustry,
  getQuestions,
  buildEnrichedPrompt,
  type Question,
} from "@/lib/questionnaire";

type Props = {
  /** Original prompt from the creation hero */
  initialPrompt: string;
  /** Called when the user finishes the wizard — passes the enriched prompt */
  onComplete: (enrichedPrompt: string) => void;
  /** Called if the user wants to skip the wizard */
  onSkip: () => void;
};

export function WizardPanel({ initialPrompt, onComplete, onSkip }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  // Fetch AI-generated questions; fall back to presets if API fails
  useEffect(() => {
    let cancelled = false;
    async function fetchQuestions() {
      try {
        const res = await fetch("/api/questionnaire", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: initialPrompt }),
        });
        if (!res.ok) throw new Error("API error");
        const data = (await res.json()) as { questions?: Question[] };
        if (!cancelled && Array.isArray(data.questions) && data.questions.length > 0) {
          setQuestions(data.questions);
          return;
        }
      } catch {
        // ignore — fall through to preset
      }
      if (!cancelled) {
        const industry = detectIndustry(initialPrompt);
        setQuestions(getQuestions(industry));
      }
    }
    void fetchQuestions().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [initialPrompt]);

  const question = questions[step];
  const isLast = step === questions.length - 1;
  const currentAnswer = question ? answers[question.id] : undefined;
  const hasAnswer = !question
    ? false
    : question.type === "single"
      ? typeof currentAnswer === "string" && currentAnswer.length > 0
      : Array.isArray(currentAnswer) && currentAnswer.length > 0;

  function toggleOption(value: string) {
    if (question.type === "single") {
      setAnswers((prev) => ({ ...prev, [question.id]: value }));
    } else {
      setAnswers((prev) => {
        const current = (prev[question.id] as string[] | undefined) ?? [];
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...prev, [question.id]: next };
      });
    }
  }

  function isSelected(value: string): boolean {
    if (question.type === "single") return currentAnswer === value;
    return (
      Array.isArray(currentAnswer) && (currentAnswer as string[]).includes(value)
    );
  }

  function handleNext() {
    if (isLast) {
      onComplete(buildEnrichedPrompt(initialPrompt, answers, questions));
    } else {
      setStep((s) => s + 1);
    }
  }

  const progressPct = Math.round(((step + 1) / questions.length) * 100);

  if (loading || !question) {
    return (
      <div className="flex h-full flex-col bg-background">
        <div className="border-b border-beige/10 px-5 py-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-beige/70" />
              Dostosuj projekt
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-beige/10">
            <div className="h-1 animate-pulse rounded-full bg-beige/30" style={{ width: "30%" }} />
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-beige/50" />
          <p className="text-sm">Przygotowuję pytania dla Twojego projektu…</p>
        </div>
        <div className="border-t border-beige/10 px-5 py-4">
          <button
            type="button"
            onClick={onSkip}
            className="h-8 cursor-pointer rounded-lg border border-transparent px-3 text-xs text-muted-foreground transition hover:text-foreground"
          >
            Pomiń i generuj od razu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b border-beige/10 px-5 py-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-beige/70" />
            Dostosuj projekt
          </span>
          <span>
            {step + 1} / {questions.length}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-beige/10">
          <div
            className="h-1 rounded-full bg-beige/60 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex flex-1 flex-col overflow-y-auto p-5">
        <p className="mb-4 text-base font-medium text-foreground">
          {question.text}
        </p>

        <div className="space-y-2">
          {question.options.map((opt) => (
            <OptionButton
              key={opt.value}
              option={opt}
              selected={isSelected(opt.value)}
              multiselect={question.type === "multi"}
              onToggle={() => toggleOption(opt.value)}
            />
          ))}
        </div>

        {/* Answer summary */}
        {Object.keys(answers).length > 0 && (
          <div className="mt-5 space-y-1">
            {Object.entries(answers).map(([qId, ans]) => {
              const q = questions.find((qq) => qq.id === qId);
              if (!q) return null;
              const label = Array.isArray(ans) ? ans.join(", ") : ans;
              const optionLabel = q.options.find((o) => o.value === (Array.isArray(ans) ? ans[0] : ans))?.label ?? label;
              return (
                <div key={qId} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Check className="h-3 w-3 text-beige/60" />
                  <span className="truncate">
                    {Array.isArray(ans) ? `${ans.length} wybranych` : optionLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-beige/10 px-5 py-4">
        <div className="flex items-center gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-beige/15 px-3 text-xs text-muted-foreground transition hover:border-beige/30 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Wstecz
            </button>
          )}

          <button
            type="button"
            onClick={onSkip}
            className="h-8 cursor-pointer rounded-lg border border-transparent px-3 text-xs text-muted-foreground transition hover:text-foreground"
          >
            Pomiń wszystko
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={!hasAnswer}
            className="ml-auto flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-beige px-3 text-xs font-medium text-beige-foreground transition hover:bg-beige/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLast ? "Generuj stronę" : "Dalej"}
            {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function OptionButton({
  option,
  selected,
  multiselect,
  onToggle,
}: {
  option: { value: string; label: string; description?: string };
  selected: boolean;
  multiselect: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full cursor-pointer rounded-lg border px-3 py-2.5 text-left transition ${
        selected
          ? "border-beige/50 bg-beige/10 text-foreground"
          : "border-beige/10 bg-card/40 text-foreground/80 hover:border-beige/25 hover:bg-card/70"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center ${
            multiselect ? "rounded" : "rounded-full"
          } border ${
            selected
              ? "border-beige bg-beige text-beige-foreground"
              : "border-beige/25"
          }`}
        >
          {selected && <Check className="h-2.5 w-2.5" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug">{option.label}</p>
          {option.description && (
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {option.description}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
