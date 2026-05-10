"use client";

import { Plus } from "lucide-react";

const CONNECTORS = [
  {
    id: "custom",
    name: "Wlasny serwer MCP",
    description: "Polacz dowolny zdalny serwer MCP z wlasnym URL i konfiguracja.",
    initials: "+",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Notatki, bazy danych i dokumentacja w workspace.",
    initials: "N",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Issue tracker i zarzadzanie projektami.",
    initials: "L",
  },
  {
    id: "context7",
    name: "Context7",
    description: "Aktualne dokumentacje bibliotek dla LLM.",
    initials: "C",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Repozytoria, issues, pull requesty i analiza kodu.",
    initials: "G",
  },
  {
    id: "sentry",
    name: "Sentry",
    description: "Monitoring bledow i wydajnosci.",
    initials: "S",
  },
];

export function ConnectorsTab() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-medium text-foreground">Konektory (MCP)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Wybierz pre-konfigurowany serwer MCP lub dodaj wlasny. Konektory
          rozszerzaja mozliwosci asystenta o zewnetrzne dane.
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {CONNECTORS.map((connector) => (
          <article
            key={connector.id}
            className="flex cursor-pointer flex-col rounded-lg border border-beige/15 bg-background/40 p-3 transition hover:border-beige/30 hover:bg-background/60"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-beige/20 bg-beige/10 text-sm font-medium text-beige">
                {connector.initials === "+" ? (
                  <Plus className="h-4 w-4" />
                ) : (
                  connector.initials
                )}
              </span>
              <p className="text-sm font-medium text-foreground">
                {connector.name}
              </p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {connector.description}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
