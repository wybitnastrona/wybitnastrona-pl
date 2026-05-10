"use client";

import { BarChart3, Database, ExternalLink, Globe } from "lucide-react";

const PILLARS = [
  {
    id: "hosting",
    icon: Globe,
    title: "Hosting i domeny",
    description:
      "Aplikacje i opublikowane projekty hostujemy na Vercel. Subdomeny *.wybitnastrona.pl i *.wybitny.host dzialaja od razu, bez konfiguracji.",
    actionLabel: "Otworz panel domen",
    actionHref: "https://vercel.com/docs/domains",
  },
  {
    id: "database",
    icon: Database,
    title: "Baza danych i autoryzacja",
    description:
      "Kazdy projekt korzysta z Supabase: tabele, autoryzacja uzytkownikow i storage plikow. Konfiguracja kluczy odbywa sie w zakladce Aplikacje.",
    actionLabel: "Dokumentacja Supabase",
    actionHref: "https://supabase.com/docs",
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "Analityka",
    description:
      "Wkrotce: prywatna analityka odwiedzin opublikowanych stron (Vercel Analytics lub Plausible). Bez ciasteczek sledzacych.",
    actionLabel: "Dowiedz sie wiecej",
    actionHref: "https://vercel.com/docs/analytics",
  },
];

export function CloudTab() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-medium text-foreground">
          Cloud wybitnastrona.pl
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Trzy filary, ktore stoja za platforma. Pelna konfiguracja
          dostepna z poziomu kreatora projektu.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        {PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <article
              key={pillar.id}
              className="flex flex-col rounded-xl border border-beige/15 bg-background/40 p-4"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-beige/20 bg-beige/10 text-beige">
                <Icon className="h-4 w-4" />
              </span>
              <h3 className="mt-3 text-sm font-medium text-foreground">
                {pillar.title}
              </h3>
              <p className="mt-1 flex-1 text-xs text-muted-foreground">
                {pillar.description}
              </p>
              <a
                href={pillar.actionHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex h-7 items-center gap-1 text-xs text-beige/90 transition hover:text-beige"
              >
                <ExternalLink className="h-3 w-3" />
                {pillar.actionLabel}
              </a>
            </article>
          );
        })}
      </div>

      <section className="rounded-lg border border-beige/15 bg-background/40 p-4">
        <h3 className="text-sm font-medium text-foreground">Status systemu</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Aktualny status uslug platformy.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <StatusBadge label="Generator AI" status="ok" />
          <StatusBadge label="Hosting podgladu" status="ok" />
          <StatusBadge label="Baza Supabase" status="ok" />
        </div>
      </section>
    </div>
  );
}

function StatusBadge({
  label,
  status,
}: {
  label: string;
  status: "ok" | "warn" | "down";
}) {
  const colors = {
    ok: "border-emerald-500/30 text-emerald-300",
    warn: "border-amber-500/30 text-amber-200",
    down: "border-red-500/30 text-red-300",
  } as const;

  const dot = {
    ok: "bg-emerald-400",
    warn: "bg-amber-400",
    down: "bg-red-400",
  } as const;

  return (
    <div
      className={`flex items-center justify-between rounded-md border bg-background/60 px-2 py-1.5 text-xs ${colors[status]}`}
    >
      <span className="text-foreground/80">{label}</span>
      <span className={`h-2 w-2 rounded-full ${dot[status]}`} />
    </div>
  );
}
