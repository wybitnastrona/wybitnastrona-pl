"use client";

import { useEffect, useState } from "react";
import { Clock, GitCompare, RotateCcw, X } from "lucide-react";
import { DiffView } from "./diff-view";
import type { ProjectFiles } from "@/lib/types/project";

type Snapshot = {
  id: string;
  project_id: string;
  label: string | null;
  created_at: string;
};

type Props = {
  projectId: string;
  /** Aktualne pliki projektu (do porownania z snapshotem przy diff). */
  currentFiles?: ProjectFiles;
  onRestored: () => void;
};

export function SnapshotPanel({ projectId, currentFiles, onRestored }: Props) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diffView, setDiffView] = useState<{
    snapshotId: string;
    files: ProjectFiles;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/snapshots`)
      .then((r) => r.json())
      .then((data: Snapshot[]) => setSnapshots(data))
      .catch(() => setError("Nie udało się załadować historii."))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function loadDiff(snapshotId: string) {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/snapshots/${snapshotId}`,
      );
      if (!res.ok) throw new Error("Snapshot fetch failed");
      const data = (await res.json()) as { files: ProjectFiles };
      setDiffView({ snapshotId, files: data.files ?? {} });
    } catch {
      setError("Nie udało się załadować diffu.");
    }
  }

  async function handleRestore(snapshotId: string) {
    if (
      !confirm(
        "Przywrócić tę wersję? Aktualne pliki zostaną nadpisane. Nie można cofnąć tej operacji.",
      )
    )
      return;
    setRestoring(snapshotId);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/snapshots/${snapshotId}/restore`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Błąd przywracania");
      onRestored();
    } catch {
      setError("Nie udało się przywrócić wersji.");
    } finally {
      setRestoring(null);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background p-4">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-beige/60" />
        <h2 className="text-sm font-medium text-foreground">
          Historia wersji
        </h2>
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground">Ładowanie historii…</p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {!loading && snapshots.length === 0 && !error && (
        <p className="text-xs text-muted-foreground">
          Brak zapisanych wersji. Snapshoty tworzone są automatycznie po każdej
          odpowiedzi AI.
        </p>
      )}

      <ul className="space-y-2">
        {snapshots.map((snap) => (
          <li
            key={snap.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-beige/10 bg-card/40 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">
                {snap.label ?? "Wersja bez opisu"}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {new Date(snap.created_at).toLocaleString("pl-PL", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {currentFiles && (
                <button
                  type="button"
                  onClick={() => loadDiff(snap.id)}
                  className="flex cursor-pointer items-center gap-1 rounded-md border border-beige/15 px-2 py-1 text-[11px] text-foreground/70 transition hover:border-beige/30 hover:text-beige"
                  aria-label="Pokaż diff"
                  title="Pokaż diff vs aktualna wersja"
                >
                  <GitCompare className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleRestore(snap.id)}
                disabled={restoring === snap.id}
                className="flex cursor-pointer items-center gap-1 rounded-md border border-beige/15 bg-card/40 px-2 py-1 text-[11px] text-foreground/70 transition hover:border-beige/30 hover:text-beige disabled:opacity-50"
              >
                <RotateCcw className="h-3 w-3" />
                {restoring === snap.id ? "Przywracam…" : "Przywróć"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {diffView && currentFiles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-beige/15 bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-beige/10 px-4 py-3">
              <h3 className="text-sm font-medium">
                Porównanie wersji — wcześniejsza vs aktualna
              </h3>
              <button
                type="button"
                onClick={() => setDiffView(null)}
                className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-card-hover hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-auto p-4">
              {pickChangedFiles(diffView.files, currentFiles).map((path) => (
                <DiffView
                  key={path}
                  path={path}
                  before={diffView.files[path]?.code ?? ""}
                  after={currentFiles[path]?.code ?? ""}
                />
              ))}
              {pickChangedFiles(diffView.files, currentFiles).length === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  Brak różnic między wersjami.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function pickChangedFiles(a: ProjectFiles, b: ProjectFiles): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const changed: string[] = [];
  for (const k of keys) {
    if ((a[k]?.code ?? "") !== (b[k]?.code ?? "")) changed.push(k);
  }
  return changed.sort();
}
