"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, LockOpen, X } from "lucide-react";
import type { ProjectFiles } from "@/lib/types/project";

type Props = {
  projectId: string;
  files: ProjectFiles;
  open: boolean;
  onClose: () => void;
};

/**
 * Dialog that lists every project file and lets the user lock individual files
 * so that subsequent AI runs cannot overwrite, patch, or delete them.
 *
 * Lock state lives in `projects.locked_files` (text[]). The AI is informed about
 * locked paths via the system prompt, and each mutation tool also rejects writes
 * to locked paths as a hard guard.
 */
export function LockFilesDialog({ projectId, files, open, onClose }: Props) {
  // Mount the actual content as a child only when `open` becomes true. That
  // way the child's state (loading, fetched data) is always initialized
  // fresh on open, with no need to setState-in-effect on the parent.
  if (!open) return null;
  return (
    <LockFilesDialogContent
      projectId={projectId}
      files={files}
      onClose={onClose}
    />
  );
}

function LockFilesDialogContent({
  projectId,
  files,
  onClose,
}: {
  projectId: string;
  files: ProjectFiles;
  onClose: () => void;
}) {
  const [locked, setLocked] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allPaths = useMemo(
    () =>
      Object.keys(files)
        // Hide the bootstrap files that are always overwritten.
        .filter((p) => p !== "/index.tsx" && p !== "/index.html")
        .sort(),
    [files],
  );

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/locked-files`)
      .then((r) => r.json())
      .then((data: { lockedFiles?: string[] }) => {
        if (cancelled) return;
        setLocked(new Set(data.lockedFiles ?? []));
      })
      .catch(() => {
        if (cancelled) return;
        setError("Nie udało się załadować zablokowanych plików.");
        setLocked(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const loading = locked === null;

  function toggle(path: string) {
    setLocked((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function save() {
    if (!locked) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/locked-files`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lockedFiles: Array.from(locked) }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to save");
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-beige/15 bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-beige/10 px-5 py-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-medium">
              <Lock className="h-4 w-4 text-beige/70" />
              Zablokowane pliki
            </h2>
            <p className="text-xs text-muted-foreground">
              AI nie nadpisze ani nie zmodyfikuje plików oznaczonych kłódką.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-card-hover hover:text-foreground"
            aria-label="Zamknij"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              Ładowanie…
            </p>
          ) : allPaths.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              Brak plików do zablokowania.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {allPaths.map((path) => {
                const isLocked = locked?.has(path) ?? false;
                return (
                  <li key={path}>
                    <button
                      type="button"
                      onClick={() => toggle(path)}
                      className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition ${
                        isLocked
                          ? "bg-beige/10 text-beige"
                          : "text-foreground/80 hover:bg-white/5"
                      }`}
                    >
                      {isLocked ? (
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <LockOpen className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      )}
                      <span className="truncate font-mono">{path}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && (
          <p className="border-t border-amber-500/20 bg-amber-500/10 px-5 py-2 text-xs text-amber-200">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-beige/10 px-5 py-3">
          <span className="text-xs text-muted-foreground">
            {locked?.size ?? 0} z {allPaths.length} zablokowanych
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-md border border-beige/15 px-3 py-1.5 text-sm text-muted-foreground hover:border-beige/30 hover:text-foreground"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="cursor-pointer rounded-md bg-beige px-3 py-1.5 text-sm font-medium text-beige-foreground hover:bg-beige/90 disabled:opacity-60"
            >
              {saving ? "Zapisywanie…" : "Zapisz"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
