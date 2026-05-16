"use client";

/**
 * Sidebar section: Twoje aplikacje natywne.
 *
 * Pokazuje liste projektów użytkownika ktore maja przynajmniej jedna
 * submission (TestFlight / Play). Per projekt badge:
 *   - "Run on device"  -> submission.status === "uploaded" (w TestFlight)
 *   - "Submitted"      -> submission.status === "submitted" (w recenzji)
 *   - "Building"       -> submission.status === "building" / "queued"
 *
 * Real-time updates przez Supabase Realtime na project_submissions.
 */

import { useEffect, useState } from "react";
import { Smartphone, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AppRow = {
  project_id: string;
  project_title: string;
  platform: "ios" | "android";
  status: string;
  updated_at: string;
};

export function SidebarMobileApps() {
  const [apps, setApps] = useState<AppRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      // Latest submission per project z joinem.
      const { data, error } = await supabase
        .from("project_submissions")
        .select("project_id, platform, status, updated_at, projects(title)")
        .order("updated_at", { ascending: false })
        .limit(20);
      if (error || cancelled) return;
      // Jeśli tabela nie istnieje (404) - obsługujemy gracefully
      if (error) {
        // Tabela project_submissions może nie istnieć w starszych deploymentach
        if (!cancelled) setApps([]);
        return;
      }

      // Dedupe per project_id (zachowaj najnowszą).
      type Row = {
        project_id: string;
        platform: "ios" | "android";
        status: string;
        updated_at: string;
        projects: { title: string }[] | { title: string } | null;
      };
      const seen = new Set<string>();
      const rows: AppRow[] = [];
      for (const r of (data ?? []) as unknown as Row[]) {
        if (seen.has(r.project_id)) continue;
        seen.add(r.project_id);
        const projObj = Array.isArray(r.projects) ? r.projects[0] : r.projects;
        rows.push({
          project_id: r.project_id,
          project_title: projObj?.title ?? "Untitled",
          platform: r.platform,
          status: r.status,
          updated_at: r.updated_at,
        });
      }
      setApps(rows.slice(0, 6));
    }

    void load();

    const channel = supabase
      .channel("sidebar-submissions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_submissions" },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  if (apps === null) return null; // pierwszy ladunek
  if (apps.length === 0) return null; // brak - ukrywamy sekcje calkiem

  return (
    <div className="mt-4">
      <div className="px-2 text-xs uppercase tracking-wider text-muted-foreground/70">
        Twoje aplikacje
      </div>
      <ul className="mt-1 space-y-0.5">
        {apps.map((app) => (
          <li key={app.project_id}>
            <a
              href={`/project/${app.project_id}`}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/80 transition hover:bg-white/5 hover:text-beige"
            >
              <Smartphone className="h-3.5 w-3.5 shrink-0 text-beige/70" />
              <span className="min-w-0 flex-1 truncate text-xs">
                {app.project_title}
              </span>
              <StatusBadge status={app.status} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "uploaded") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-emerald-300">
        Installed
      </span>
    );
  }
  if (status === "submitted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-beige/30 bg-beige/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-beige">
        <CheckCircle2 className="h-2.5 w-2.5" />
        Submitted
      </span>
    );
  }
  if (status === "building" || status === "queued") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-beige/15 bg-background/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
        Building
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-950/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-rose-300">
        Failed
      </span>
    );
  }
  return null;
}
