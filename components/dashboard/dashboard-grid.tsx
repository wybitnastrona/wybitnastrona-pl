"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Globe, Search, Sparkles, X } from "lucide-react";
import type { ProjectListItem } from "@/lib/types/project";

type Props = {
  projects: ProjectListItem[];
};

export function DashboardGrid({ projects }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => {
      const haystack = `${p.title} ${p.prompt}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [projects, query]);

  if (projects.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <div className="mb-5 flex items-center gap-2">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj po nazwie lub opisie…"
            className="h-9 w-full rounded-lg border border-beige/15 bg-card/60 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground/60 transition focus:border-beige/40 focus:bg-card focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground"
              aria-label="Wyczyść"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {filtered.length === projects.length
            ? `${projects.length} ${pluralize(projects.length, "projekt", "projekty", "projektów")}`
            : `${filtered.length} z ${projects.length}`}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-beige/15 bg-card/40 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Nic nie znaleziono dla zapytania <span className="text-foreground">{query}</span>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <a
              key={project.id}
              href={`/project/${project.id}`}
              className="group flex flex-col gap-3 rounded-xl border border-beige/10 bg-card p-4 transition hover:border-beige/40 hover:bg-card/80"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="line-clamp-2 text-base font-medium text-foreground transition group-hover:text-beige">
                  {project.title}
                </h2>
                {project.is_public && project.slug && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-beige/20 bg-background px-2 py-0.5 text-[10px] uppercase tracking-wider text-beige/80">
                    <Globe className="h-3 w-3" />
                    Live
                  </span>
                )}
              </div>
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {project.prompt}
              </p>
              <p className="mt-auto text-xs text-muted-foreground">
                Aktualizacja:{" "}
                {new Date(project.updated_at).toLocaleDateString("pl-PL", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </a>
          ))}
        </div>
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-beige/20 bg-card/40 px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-beige/30 bg-beige/10 text-beige">
        <Sparkles className="h-5 w-5" />
      </div>
      <h2 className="text-xl font-medium tracking-tight">
        Brak projektów — zacznij budować
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Wpisz pomysł na stronie głównej, a AI wygeneruje pierwszy projekt w kilka sekund.
      </p>
      <Link
        href="/"
        className="inline-flex h-9 items-center justify-center rounded-lg bg-beige px-4 text-sm font-medium text-beige-foreground transition hover:bg-beige/90"
      >
        Stwórz pierwszy projekt
      </Link>
    </div>
  );
}

function pluralize(n: number, one: string, few: string, many: string): string {
  // Polish plural rules: 1, 2-4 except 12-14, rest
  if (n === 1) return one;
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 12 && lastTwo <= 14) return many;
  if (last >= 2 && last <= 4) return few;
  return many;
}
