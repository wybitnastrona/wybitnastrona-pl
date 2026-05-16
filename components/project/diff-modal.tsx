"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { DiffView } from "./diff-view";

export type PendingChange = {
  path: string;
  before: string;
  after: string;
};

type Props = {
  open: boolean;
  changes: PendingChange[];
  onAccept: (paths: string[]) => void;
  onReject: () => void;
};

/**
 * Modal pokazujacy proponowane zmiany AI z mozliwoscia akceptacji per plik
 * lub odrzucenia wszystkiego.
 */
export function DiffModal({ open, changes, onAccept, onReject }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  if (!open) return null;
  const current = changes[selectedIdx];

  function toggleAccept(path: string) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function acceptAll() {
    onAccept(changes.map((c) => c.path));
  }

  function acceptSelected() {
    onAccept(Array.from(accepted));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-beige/15 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-beige/10 px-5 py-3">
          <div>
            <h2 className="text-base font-medium">Proponowane zmiany</h2>
            <p className="text-xs text-muted-foreground">
              {changes.length} plików - przejrzyj i zaakceptuj.
            </p>
          </div>
          <button
            type="button"
            onClick={onReject}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-card-hover hover:text-foreground"
            aria-label="Zamknij"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-[240px_1fr] overflow-hidden">
          <aside className="overflow-y-auto border-r border-beige/10 bg-background/40 p-2">
            {changes.map((c, i) => {
              const isSelected = i === selectedIdx;
              const isAccepted = accepted.has(c.path);
              return (
                <button
                  key={c.path}
                  type="button"
                  onClick={() => setSelectedIdx(i)}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition ${
                    isSelected ? "bg-card-hover" : "hover:bg-card-hover/50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAccept(c.path);
                    }}
                    className={`flex h-4 w-4 cursor-pointer items-center justify-center rounded border transition ${
                      isAccepted
                        ? "border-emerald-400 bg-emerald-500/30 text-emerald-200"
                        : "border-beige/20 hover:border-beige/40"
                    }`}
                    aria-label={isAccepted ? "Cofnij" : "Akceptuj"}
                  >
                    {isAccepted && <Check className="h-3 w-3" />}
                  </button>
                  <span className="truncate font-mono">{c.path}</span>
                </button>
              );
            })}
          </aside>

          <main className="overflow-auto p-4">
            {current ? (
              <DiffView
                path={current.path}
                before={current.before}
                after={current.after}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Brak zmian.</p>
            )}
          </main>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-beige/10 px-5 py-3">
          <button
            type="button"
            onClick={onReject}
            className="cursor-pointer rounded-md border border-beige/15 px-3 py-1.5 text-sm text-muted-foreground hover:border-beige/30 hover:text-foreground"
          >
            Odrzuć wszystko
          </button>
          {accepted.size > 0 && accepted.size < changes.length && (
            <button
              type="button"
              onClick={acceptSelected}
              className="cursor-pointer rounded-md border border-beige/30 px-3 py-1.5 text-sm text-beige hover:border-beige/50"
            >
              Zastosuj zaznaczone ({accepted.size})
            </button>
          )}
          <button
            type="button"
            onClick={acceptAll}
            className="cursor-pointer rounded-md bg-beige px-3 py-1.5 text-sm font-medium text-beige-foreground hover:bg-beige/90"
          >
            Zastosuj wszystko
          </button>
        </div>
      </div>
    </div>
  );
}
