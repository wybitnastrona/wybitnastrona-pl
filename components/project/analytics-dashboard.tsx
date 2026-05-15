"use client";

/**
 * Analytics dashboard projektu — uzywany w `ProjectSettingsDialog`.
 *
 * Pokazuje:
 *  - Karty z sumami per typ eventu (view / prompt / publish / ...).
 *  - Bar chart "Aktywnosc dziennie" z stackowanymi kolorami per typ.
 *  - Selektor zakresu czasu Day / Week / Month.
 *
 * Source danych: GET /api/projects/[id]/stats?days=1|7|30
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

type Event = { event_type: string; count: number; day: string };

type Range = "day" | "week" | "month";

const RANGE_TO_DAYS: Record<Range, number> = {
  day: 1,
  week: 7,
  month: 30,
};

const TYPE_LABELS: Record<string, string> = {
  view: "Wyswietlenia",
  prompt: "Zapytania AI",
  publish: "Publikacje",
  remix: "Remixy",
  edit: "Edycje",
  export: "Eksporty",
  error: "Bledy",
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

type Props = {
  /** Jezeli podany, dashboard sam fetchuje pod /api/projects/{id}/stats. */
  projectId?: string;
  /** Statyczne dane (kompatybilnosc z poprzednim API). */
  events?: Event[];
};

export function AnalyticsDashboard({ projectId, events }: Props) {
  const [range, setRange] = useState<Range>("month");
  const [data, setData] = useState<Event[]>(events ?? []);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (r: Range) => {
      if (!projectId) return;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/stats?days=${RANGE_TO_DAYS[r]}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const d = (await res.json()) as { events: Event[] };
          setData(d.events ?? []);
        }
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    if (projectId) void load(range);
  }, [projectId, range, load]);

  // Sumy per typ
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const e of data) {
      t[e.event_type] = (t[e.event_type] ?? 0) + Number(e.count);
    }
    return t;
  }, [data]);

  // Dzienne sumy (stack chart)
  type DayBucket = { day: string; counts: Record<string, number>; total: number };
  const byDay = useMemo<DayBucket[]>(() => {
    const map = new Map<string, Record<string, number>>();
    for (const e of data) {
      if (!map.has(e.day)) map.set(e.day, {});
      const day = map.get(e.day)!;
      day[e.event_type] = (day[e.event_type] ?? 0) + Number(e.count);
    }
    const arr = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, counts]) => {
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        return { day, counts, total };
      });
    return arr;
  }, [data]);

  const maxValue = useMemo(() => {
    let max = 0;
    for (const d of byDay) if (d.total > max) max = d.total;
    return max || 1;
  }, [byDay]);

  const hasAny = data.length > 0;

  return (
    <div className="space-y-6">
      {/* Header: title + range selector (Bolt-style top-right tabs) */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-foreground">Analytics</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            View visitor and traffic data for your published site.
          </p>
        </div>
        <div className="inline-flex items-center gap-0.5 rounded-md border border-beige/15 bg-background/40 p-0.5 text-[11px]">
          {(["day", "week", "month"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`cursor-pointer rounded-sm px-2.5 py-1 transition ${
                range === r
                  ? "bg-beige/15 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "day" ? "Day" : r === "week" ? "Week" : "Month"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Object.entries(TYPE_LABELS).slice(0, 4).map(([type, label]) => (
          <div
            key={type}
            className="flex flex-col gap-1 rounded-lg border border-beige/10 bg-card/40 px-3 py-2"
          >
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            <span
              className="text-xl font-medium"
              style={{ color: TYPE_COLORS[type] }}
            >
              {(totals[type] ?? 0).toLocaleString("pl-PL")}
            </span>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="rounded-xl border border-beige/10 bg-card/40 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            Aktywnosc dziennie
          </h3>
          {loading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>

        {!hasAny && !loading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            Brak danych w wybranym zakresie. Eventy beda widoczne po pierwszych
            odwiedzinach opublikowanej strony lub zapytaniach AI.
          </div>
        ) : (
          <>
            <div className="flex h-48 items-end gap-1">
              {byDay.map((d) => {
                const heightPct = (d.total / maxValue) * 100;
                // Stack: kazdy typ jako oddzielny kolorowy segment.
                const segments = Object.entries(d.counts).filter(
                  ([, v]) => v > 0,
                );
                return (
                  <div
                    key={d.day}
                    className="group relative flex flex-1 flex-col-reverse"
                    style={{ height: `${heightPct}%`, minHeight: "2px" }}
                    title={`${d.day}: ${d.total}`}
                  >
                    {segments.map(([type, count]) => (
                      <div
                        key={type}
                        style={{
                          backgroundColor: TYPE_COLORS[type] ?? "#888",
                          flexBasis: `${(count / d.total) * 100}%`,
                        }}
                        className="first:rounded-t-sm"
                      />
                    ))}
                    <div className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-card-hover px-2 py-1 text-[10px] text-foreground shadow-md group-hover:block">
                      {d.day}: {d.total}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legenda */}
            <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
              {Object.entries(TYPE_LABELS).map(([type, label]) => (
                <span key={type} className="inline-flex items-center gap-1">
                  <span
                    className="inline-block h-2 w-2 rounded-sm"
                    style={{ backgroundColor: TYPE_COLORS[type] }}
                  />
                  {label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
