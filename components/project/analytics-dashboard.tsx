"use client";

import { useMemo } from "react";

type Event = { event_type: string; count: number; day: string };

const TYPE_LABELS: Record<string, string> = {
  view: "Wyświetlenia",
  prompt: "Zapytania AI",
  publish: "Publikacje",
  remix: "Remixy",
  edit: "Edycje",
  export: "Eksporty",
  error: "Błędy",
};

const TYPE_COLORS: Record<string, string> = {
  view: "#60a5fa",
  prompt: "#e8dcc4",
  publish: "#34d399",
  remix: "#fb7185",
  edit: "#a78bfa",
  export: "#fbbf24",
  error: "#ef4444",
};

export function AnalyticsDashboard({ events }: { events: Event[] }) {
  // Sumy per typ
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const e of events) t[e.event_type] = (t[e.event_type] ?? 0) + Number(e.count);
    return t;
  }, [events]);

  // Dzienne sumy (line chart)
  type DayBucket = { day: string; counts: Record<string, number> };
  const byDay = useMemo<DayBucket[]>(() => {
    const map = new Map<string, Record<string, number>>();
    for (const e of events) {
      if (!map.has(e.day)) map.set(e.day, {});
      const day = map.get(e.day)!;
      day[e.event_type] = (day[e.event_type] ?? 0) + Number(e.count);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, counts]) => ({ day, counts }));
  }, [events]);

  const maxValue = useMemo(() => {
    let max = 0;
    for (const d of byDay) {
      let sum = 0;
      for (const v of Object.values(d.counts)) sum += v;
      if (sum > max) max = sum;
    }
    return max || 1;
  }, [byDay]);

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-beige/10 bg-card/40 p-10 text-center text-sm text-muted-foreground">
        Brak danych. Eventy beda widoczne po pierwszych zapytaniach AI lub odwiedzinach
        opublikowanej strony.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <div
            key={type}
            className="flex flex-col gap-1 rounded-xl border border-beige/10 bg-card/40 p-4"
          >
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            <span
              className="text-2xl font-medium"
              style={{ color: TYPE_COLORS[type] }}
            >
              {totals[type] ?? 0}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-beige/10 bg-card/40 p-5">
        <h2 className="mb-4 text-sm font-medium">Aktywność dziennie</h2>
        <div className="flex h-48 items-end gap-1">
          {byDay.map((d) => {
            const sum = Object.values(d.counts).reduce((a, b) => a + b, 0);
            const heightPct = (sum / maxValue) * 100;
            return (
              <div
                key={d.day}
                className="group relative flex-1 rounded-sm bg-beige/30 transition hover:bg-beige/60"
                style={{ height: `${heightPct}%` }}
                title={`${d.day}: ${sum}`}
              >
                <div className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-card-hover px-2 py-1 text-[10px] group-hover:block">
                  {d.day}: {sum}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
