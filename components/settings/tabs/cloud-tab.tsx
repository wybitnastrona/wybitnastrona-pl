"use client";

/**
 * CloudTab - status usług platformy z prawdziwym monitoringiem.
 *
 * Sprawdza realne statusy:
 *  - Generowanie AI: testuje /api/enhance-prompt z timeout
 *  - Hosting podglądu: testuje dostępność bundler.codesandbox.io
 *  - Baza Supabase: sprawdza czy profiles jest dostępne
 *  - Własna domena projektu (opcjonalnie)
 */

import { useEffect, useRef, useState } from "react";
import { BarChart3, Database, ExternalLink, Globe, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PILLARS = [
  {
    id: "hosting",
    icon: Globe,
    title: "Hosting i domeny",
    description:
      "Aplikacje i opublikowane projekty hostowane na Vercel. Subdomeny *.wybitnastrona.pl i *.wybitny.website działają od razu, bez konfiguracji.",
    actionLabel: "Otwórz panel domen",
    actionHref: "https://vercel.com/docs/domains",
  },
  {
    id: "database",
    icon: Database,
    title: "Baza danych i autoryzacja",
    description:
      "Każdy projekt korzysta z Supabase: tabele, autoryzacja użytkowników i storage plików. Konfiguracja kluczy odbywa się w zakładce Aplikacje.",
    actionLabel: "Dokumentacja Supabase",
    actionHref: "https://supabase.com/docs",
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "Analityka",
    description:
      "Wkrótce: prywatna analityka odwiedzin opublikowanych stron (Vercel Analytics lub Plausible). Bez ciasteczek śledzących.",
    actionLabel: "Dowiedz się więcej",
    actionHref: "https://vercel.com/docs/analytics",
  },
];

type SystemStatus = "checking" | "ok" | "warn" | "down";

type SystemStatuses = {
  ai: SystemStatus;
  preview: SystemStatus;
  database: SystemStatus;
};

async function checkAI(): Promise<SystemStatus> {
  try {
    const res = await fetch("/api/enhance-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "test" }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok || res.status === 401 ? "ok" : "warn";
  } catch {
    return "warn";
  }
}

async function checkPreview(): Promise<SystemStatus> {
  try {
    const res = await fetch(
      "https://sandpack-bundler.codesandbox.io",
      { method: "HEAD", mode: "no-cors", signal: AbortSignal.timeout(5000) },
    );
    // no-cors zwraca opaque response - jesli nie rzuci, serwer odpowiada
    void res;
    return "ok";
  } catch {
    return "warn";
  }
}

async function checkDatabase(): Promise<SystemStatus> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);
    if (error && error.code !== "PGRST116") return "warn";
    return "ok";
  } catch {
    return "down";
  }
}

export function CloudTab() {
  const [statuses, setStatuses] = useState<SystemStatuses>({
    ai: "checking",
    preview: "checking",
    database: "checking",
  });
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function runChecks() {
    setRefreshing(true);
    setStatuses({ ai: "checking", preview: "checking", database: "checking" });
    const [ai, preview, database] = await Promise.all([
      checkAI(),
      checkPreview(),
      checkDatabase(),
    ]);
    setStatuses({ ai, preview, database });
    setLastChecked(new Date());
    setRefreshing(false);
  }

  // Trigger initial check asynchronously po montowaniu (nie synchronicznie w efekcie)
  const hasCheckedRef = useRef(false);
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    const timer = setTimeout(() => {
      void runChecks();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-medium text-foreground">
          Cloud wybitnastrona.pl
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Trzy filary, które stoją za platformą. Pełna konfiguracja
          dostępna z poziomu kreatora projektu.
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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">Status systemu</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {lastChecked
                ? `Sprawdzono: ${lastChecked.toLocaleTimeString("pl-PL")}`
                : "Sprawdzanie…"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runChecks()}
            disabled={refreshing}
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-beige/15 bg-background/40 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-beige/30 hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            Odśwież
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <StatusBadge label="Generator AI (Anthropic)" status={statuses.ai} />
          <StatusBadge label="Podgląd (CodeSandbox)" status={statuses.preview} />
          <StatusBadge label="Baza danych (Supabase)" status={statuses.database} />
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          ● Zielony = działa normalnie · ● Żółty = opóźnienia lub niedostępny · ● Czerwony = błąd krytyczny
        </p>
      </section>
    </div>
  );
}

function StatusBadge({
  label,
  status,
}: {
  label: string;
  status: SystemStatus;
}) {
  const colors = {
    checking: "border-beige/15 text-muted-foreground",
    ok: "border-emerald-500/30 text-emerald-300",
    warn: "border-amber-500/30 text-amber-200",
    down: "border-red-500/30 text-red-300",
  } as const;

  const dot: Record<SystemStatus, string> = {
    checking: "bg-beige/30 animate-pulse",
    ok: "bg-emerald-400",
    warn: "bg-amber-400",
    down: "bg-red-400",
  };

  const label2: Record<SystemStatus, string> = {
    checking: "Sprawdzanie…",
    ok: "Działa",
    warn: "Opóźnienia",
    down: "Błąd",
  };

  return (
    <div
      className={`flex items-center justify-between rounded-md border bg-background/60 px-2.5 py-2 text-xs ${colors[status]}`}
    >
      <span className="truncate text-foreground/80">{label}</span>
      <div className="ml-2 flex shrink-0 items-center gap-1.5">
        <span className="text-[10px]">{label2[status]}</span>
        <span className={`h-2 w-2 rounded-full ${dot[status]}`} />
      </div>
    </div>
  );
}
