"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { PromptDef, PromptCategory } from "@/lib/prompts-library";
import { useAuth } from "@/components/auth/auth-provider";

type Props = {
  prompts: PromptDef[];
  categories: { id: PromptCategory; label: string }[];
};

export function TemplatesGrid({ prompts, categories }: Props) {
  const router = useRouter();
  const { user, openAuth } = useAuth();
  const [filter, setFilter] = useState<PromptCategory | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered =
    filter === "all" ? prompts : prompts.filter((p) => p.category === filter);

  async function start(p: PromptDef) {
    if (!user) {
      openAuth({ mode: "login" });
      return;
    }
    setBusy(p.id);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: p.prompt,
          template: p.recommendedTemplate,
        }),
      });
      const data = (await res.json()) as { id?: string };
      if (data.id) router.push(`/project/${data.id}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        <Filter
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="Wszystkie"
        />
        {categories.map((c) => (
          <Filter
            key={c.id}
            active={filter === c.id}
            onClick={() => setFilter(c.id)}
            label={c.label}
          />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => start(p)}
            disabled={busy === p.id}
            className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-beige/10 bg-card/40 p-5 text-left transition hover:border-beige/30 hover:bg-card disabled:opacity-50"
          >
            <span className="self-start rounded-full border border-beige/15 bg-background/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {categories.find((c) => c.id === p.category)?.label ?? p.category}
            </span>
            <h3 className="text-base font-medium">{p.title}</h3>
            <p className="text-sm text-muted-foreground">{p.description}</p>
            <span className="mt-auto inline-flex items-center gap-1 text-sm text-beige opacity-0 transition group-hover:opacity-100">
              Wystartuj <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Filter({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs transition ${
        active
          ? "border-beige/40 bg-beige/10 text-beige"
          : "border-beige/10 text-muted-foreground hover:border-beige/30 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
