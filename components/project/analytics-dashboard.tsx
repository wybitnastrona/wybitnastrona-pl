"use client";

/**
 * Analytics dashboard projektu - uzywany w `ProjectSettingsDialog`.
 *
 * Pokazuje:
 *  - Karty z sumami per typ eventu (view / prompt / publish / ...).
 *  - Bar chart "Aktywnosc dziennie" z stackowanymi kolorami per typ.
 *  - Selektor zakresu czasu 7d / 14d / 30d.
 *
 * Wykres zawsze pokazuje PELNA siatkę kubełków (np. 30 dla 30d, 28 dla 7d).
 * Kubełki bez danych mają wysokość 0 ale tooltip ze znacznikiem czasu.
 * Source danych: GET /api/projects/[id]/stats?days=1|7|30&bucket_hours=6|12|24
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

type Event = { event_type: string; count: number; day: string; bucket?: string };

type Range = "7d" | "14d" | "30d";

const RANGE_PRESETS: Record<
  Range,
  { days: number; bucketHours: number; label: string }
> = {
  "7d": { days: 7, bucketHours: 6, label: "7 dni" },
  "14d": { days: 14, bucketHours: 12, label: "14 dni" },
  "30d": { days: 30, bucketHours: 24, label: "30 dni" },
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
  projectId?: string;
  events?: Event[];
};

type DayBucket = {
  label: string;
  counts: Record<string, number>;
  total: number;
};

/**
 * Builds a full, evenly-spaced array of buckets for the given range.
 * Each bucket aligns with Postgres `date_bin(..., 'epoch')`:
 *   bin(t) = floor(epoch_ms / stepMs) * stepMs
 *
 * We generate numBuckets ending at the current moment's bin, then merge
 * actual event data. Buckets with no events get total=0 but still render
 * with a hover tooltip so the chart always fills the full time window.
 */
function buildFullGrid(
  data: Event[],
  days: number,
  bucketHours: number,
): DayBucket[] {
  const stepMs = bucketHours * 3600 * 1000;
  const numBuckets = Math.round((days * 24) / bucketHours);

  const nowBin = Math.floor(Date.now() / stepMs) * stepMs;
  const startBin = nowBin - (numBuckets - 1) * stepMs;

  // Build label map from actual data (key = "YYYY-MM-DD HH:MM")
  const dataMap = new Map<string, Record<string, number>>();
  for (const e of data) {
    const key = e.day; // already formatted as "YYYY-MM-DD HH:MM" from API
    if (!dataMap.has(key)) dataMap.set(key, {});
    const bucket = dataMap.get(key)!;
    bucket[e.event_type] = (bucket[e.event_type] ?? 0) + Number(e.count);
  }

  const buckets: DayBucket[] = [];
  for (let i = 0; i < numBuckets; i++) {
    const t = startBin + i * stepMs;
    const iso = new Date(t).toISOString();
    const label = iso.slice(0, 16).replace("T", " ");

    const counts = dataMap.get(label) ?? {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    buckets.push({ label, counts, total });
  }
  return buckets;
}

export function AnalyticsDashboard({ projectId, events }: Props) {
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<Event[]>(events ?? []);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (r: Range) => {
      if (!projectId) return;
      const preset = RANGE_PRESETS[r];
      setLoading(true);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/stats?days=${preset.days}&bucket_hours=${preset.bucketHours}`,
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

  // Totals per type for summary tiles
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const e of data) {
      t[e.event_type] = (t[e.event_type] ?? 0) + Number(e.count);
    }
    return t;
  }, [data]);

  const preset = RANGE_PRESETS[range];

  // Full grid of buckets - always numBuckets long
  const grid = useMemo(
    () => buildFullGrid(data, preset.days, preset.bucketHours),
    [data, preset.days, preset.bucketHours],
  );

  const maxValue = useMemo(() => {
    const m = Math.max(...grid.map((b) => b.total));
    return m > 0 ? m : 1;
  }, [grid]);

  const hasAny = data.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-foreground">Analytics</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            View visitor and traffic data for your published site.
          </p>
        </div>
        <div className="inline-flex items-center gap-0.5 rounded-md border border-beige/15 bg-background/40 p-0.5 text-[11px]">
          {(["7d", "14d", "30d"] as const).map((r) => (
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
              {RANGE_PRESETS[r].label}
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
            {/* Full-grid bar chart - wąskie słupki, zawsze pełna liczba kubełków */}
            <div className="flex h-48 items-end gap-px overflow-hidden">
              {grid.map((bucket, i) => {
                const heightPct = (bucket.total / maxValue) * 100;
                const segments = Object.entries(bucket.counts).filter(
                  ([, v]) => v > 0,
                );
                const isEmpty = bucket.total === 0;

                // Formatuj etykietę: tylko godzina lub DD.MM
                const labelShort =
                  preset.bucketHours < 24
                    ? bucket.label.slice(11, 16) // "HH:MM"
                    : bucket.label.slice(5, 10).replace("-", "."); // "MM.DD"

                return (
                  <div
                    key={i}
                    className="group relative flex min-w-0 flex-1 flex-col-reverse"
                    style={{ height: "100%" }}
                    title={`${bucket.label}: ${bucket.total}`}
                  >
                    {/* Actual bar */}
                    {!isEmpty && (
                      <div
                        className="absolute bottom-0 left-0 right-0 flex flex-col-reverse overflow-hidden rounded-t-[1px]"
                        style={{ height: `${heightPct}%` }}
                      >
                        {segments.map(([type, count]) => (
                          <div
                            key={type}
                            style={{
                              backgroundColor: TYPE_COLORS[type] ?? "#888",
                              flexBasis: `${(count / bucket.total) * 100}%`,
                              flexShrink: 0,
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Empty bucket placeholder - very subtle */}
                    {isEmpty && (
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100">
                        <div className="h-full w-full rounded-sm bg-beige/5" />
                      </div>
                    )}

                    {/* Tooltip */}
                    <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-card px-2 py-1 text-[10px] text-foreground shadow-md group-hover:block">
                      {bucket.label}
                      {bucket.total > 0 && `: ${bucket.total}`}
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
