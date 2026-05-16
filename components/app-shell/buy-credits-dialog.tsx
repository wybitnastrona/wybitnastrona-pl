"use client";

/**
 * BuyCreditsDialog - DEPRECATED. Topupy one-time zostaly usuniete (Bolt-style
 * pricing: tylko subskrypcja PRO ze sliderem). Komponent zostal zachowany jako
 * cienki shim - pokazuje krotki komunikat i prowadzi do /pricing.
 */

import { useEffect } from "react";
import { X, ArrowUpRight } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function BuyCreditsDialog({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-beige/20 bg-card p-6 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-foreground">
              Kredyty tylko w subskrypcji
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Nie sprzedajemy już doładowań jednorazowych. Wybierz pakiet PRO ze
              suwakiem - od 500 do 96 000 kredytów miesięcznie. Pełna lista
              modeli (Pan Programista, Opus 4.6, Opus 4.7), własna subdomena i
              integracje czekają na Ciebie.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
            aria-label="Zamknij"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <a
          href="/pricing"
          className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-beige text-sm font-medium text-beige-foreground transition hover:bg-beige/90"
        >
          Zobacz plany PRO
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
