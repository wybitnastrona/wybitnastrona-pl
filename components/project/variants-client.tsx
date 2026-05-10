"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SandpackRunner } from "@/components/sandpack/sandpack-runner";
import type { ProjectFiles } from "@/lib/types/project";

type Variant = {
  id: string;
  temperature: number;
  summary: string;
  files: ProjectFiles;
};

type Props = {
  projectId: string;
  prompt: string;
};

export function VariantsClient({ projectId, prompt }: Props) {
  const router = useRouter();
  const [editPrompt, setEditPrompt] = useState(prompt);
  const [variants, setVariants] = useState<Variant[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/generate/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, prompt: editPrompt }),
      });
      const data = (await res.json()) as { variants?: Variant[]; error?: string };
      if (data.variants) {
        setVariants(data.variants);
      } else {
        setError(data.error ?? "Nie udało się wygenerować wariantów");
      }
    } finally {
      setLoading(false);
    }
  }

  async function accept(variant: Variant) {
    setAccepting(variant.id);
    try {
      const res = await fetch("/api/generate/variants/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          files: variant.files,
          label: `Wybrano wariant T=${variant.temperature}`,
        }),
      });
      if (res.ok) {
        router.push(`/project/${projectId}`);
      } else {
        setError("Nie udało się zaakceptować");
      }
    } finally {
      setAccepting(null);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b border-beige/10 bg-background/80 px-4 backdrop-blur">
        <button
          type="button"
          onClick={() => router.push(`/project/${projectId}`)}
          className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-beige"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć
        </button>
        <h1 className="text-sm font-medium">A/B Testing — 3 warianty</h1>
        <div className="text-xs text-muted-foreground">
          Koszt: <span className="text-amber-400">3× punktów</span>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        <section className="mx-auto max-w-3xl">
          <textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="Co chcesz zbudować?"
            rows={3}
            className="w-full resize-y rounded-lg border border-beige/15 bg-card/40 p-3 text-sm focus:border-beige/40 focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              AI wygeneruje 3 różne implementacje (T=0.3, 0.7, 1.0). Wybierz
              najlepszą.
            </p>
            <Button
              type="button"
              onClick={generate}
              disabled={loading || !editPrompt.trim()}
              className="bg-beige text-beige-foreground hover:bg-beige/90"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Sparkles className="h-3.5 w-3.5" />
              Wygeneruj 3 warianty
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-rose-300">{error}</p>
          )}
        </section>

        {variants && (
          <section className="mt-6">
            <div className="grid gap-4 lg:grid-cols-3">
              {variants.map((v, idx) => (
                <article
                  key={v.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-beige/15 bg-card"
                >
                  <header className="border-b border-beige/10 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-beige">
                        Wariant {idx + 1}
                      </span>
                      <span className="rounded-full border border-beige/15 bg-background/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                        T={v.temperature}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                      {v.summary}
                    </p>
                  </header>
                  <div className="h-[400px] border-b border-beige/10">
                    <SandpackRunner
                      files={v.files}
                      viewMode="preview"
                      hideInternalNavigator
                    />
                  </div>
                  <footer className="px-3 py-2">
                    <Button
                      type="button"
                      onClick={() => accept(v)}
                      disabled={accepting !== null}
                      className="w-full bg-beige text-beige-foreground hover:bg-beige/90"
                    >
                      {accepting === v.id && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      <Check className="h-3.5 w-3.5" />
                      Wybierz ten
                    </Button>
                  </footer>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
