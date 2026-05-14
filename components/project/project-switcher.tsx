"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Clock,
  Globe,
  LayoutTemplate,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import type { ProjectListItem } from "@/lib/types/project";

type Props = {
  currentProject: { id: string; title: string; updated_at?: string };
};

export function ProjectSwitcher({ currentProject }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex min-w-0 max-w-[220px] cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-sm transition hover:bg-white/5"
        title="Przełącz projekt"
      >
        <LayoutTemplate className="h-4 w-4 shrink-0 text-beige/70" />
        <span className="min-w-0 truncate font-medium text-foreground">
          {currentProject.title}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition group-hover:text-muted-foreground" />
      </button>

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" />
      )}

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        className={`fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-beige/10 bg-[#111110] shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-beige/10 px-4">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Projekty
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
            aria-label="Zamknij"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current project info */}
        <div className="border-b border-beige/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-beige/10">
              <LayoutTemplate className="h-4 w-4 text-beige/70" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {currentProject.title}
              </p>
              {currentProject.updated_at && (
                <p className="text-[11px] text-muted-foreground">
                  {formatDate(currentProject.updated_at)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* New project button */}
        <div className="border-b border-beige/10 px-4 py-3">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-beige/20 px-3 py-2 text-xs text-muted-foreground transition hover:border-beige/40 hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Nowy projekt
          </Link>
        </div>

        {/* Projects list — only mounted while open so initial loading state
            can be set during render without setState-in-effect. */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {open && (
            <ProjectsList
              currentProjectId={currentProject.id}
              onSelect={() => setOpen(false)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-beige/10 px-4 py-3">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 text-xs text-muted-foreground transition hover:text-foreground"
          >
            Wszystkie projekty →
          </Link>
        </div>
      </div>
    </>
  );
}

function ProjectsList({
  currentProjectId,
  onSelect,
}: {
  currentProjectId: string;
  onSelect: () => void;
}) {
  type State =
    | { kind: "loading" }
    | { kind: "data"; projects: ProjectListItem[] }
    | { kind: "error"; message: string }
    | { kind: "unauthorized" };
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects/list")
      .then(async (r) => {
        if (r.status === 401) {
          if (!cancelled) setState({ kind: "unauthorized" });
          return;
        }
        if (!r.ok) {
          if (!cancelled)
            setState({
              kind: "error",
              message: `HTTP ${r.status} — spróbuj odświeżyć stronę.`,
            });
          return;
        }
        const data = (await r.json()) as
          | ProjectListItem[]
          | { projects: ProjectListItem[] };
        const projects = Array.isArray(data) ? data : (data.projects ?? []);
        if (!cancelled) setState({ kind: "data", projects });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Problem z połączeniem";
        if (process.env.NODE_ENV !== "production") {
          console.warn("[project-switcher] fetch failed:", err);
        }
        setState({ kind: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (state.kind === "unauthorized") {
    return (
      <div className="space-y-2 px-2 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Zaloguj się, aby zobaczyć swoje projekty.
        </p>
        <Link
          href="/signin"
          onClick={onSelect}
          className="inline-flex items-center gap-1 text-xs text-beige underline-offset-4 hover:underline"
        >
          Przejdź do logowania →
        </Link>
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="space-y-2 px-2 py-4 text-center">
        <p className="text-xs text-rose-300/80">
          Nie udało się wczytać projektów.
        </p>
        <p className="text-[10px] text-muted-foreground">{state.message}</p>
      </div>
    );
  }
  const projects = state.projects;
  if (projects.length === 0) {
    return (
      <div className="space-y-2 px-2 py-4 text-center">
        <p className="text-xs text-muted-foreground">Brak innych projektów</p>
        <Link
          href="/"
          onClick={onSelect}
          className="inline-flex items-center gap-1 text-xs text-beige underline-offset-4 hover:underline"
        >
          Stwórz pierwszy projekt →
        </Link>
      </div>
    );
  }
  return (
    <ul className="space-y-0.5">
      {projects.map((p) => (
        <li key={p.id}>
          <a
            href={`/project/${p.id}`}
            onClick={onSelect}
            className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm transition hover:bg-white/5 ${
              p.id === currentProjectId
                ? "bg-beige/8 text-foreground"
                : "text-foreground/80"
            }`}
          >
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-beige/10">
              {p.is_public ? (
                <Globe className="h-3 w-3 text-beige/60" />
              ) : (
                <LayoutTemplate className="h-3 w-3 text-beige/60" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium leading-tight">
                {p.title}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                {formatDate(p.updated_at)}
              </p>
            </div>
            {p.id === currentProjectId && (
              <span className="shrink-0 self-center rounded-full bg-beige/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-beige/80">
                aktywny
              </span>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return "dziś";
  if (diffDays === 1) return "wczoraj";
  if (diffDays < 7) return `${diffDays} dni temu`;
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}
