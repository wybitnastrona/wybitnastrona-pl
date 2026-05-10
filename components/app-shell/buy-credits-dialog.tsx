"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles, X, Zap } from "lucide-react";
import { STRIPE_PRODUCTS, formatAmount } from "@/lib/stripe-products";
import { useAuth } from "@/components/auth/auth-provider";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function BuyCreditsDialog({ open, onClose }: Props) {
  const { user, openAuth } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  if (!open) return null;

  async function buy(productId: string) {
    if (!user) {
      openAuth({ mode: "login" });
      return;
    }
    setBusy(productId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.assign(data.url);
      } else {
        alert(data.error ?? "Nie udalo sie rozpoczac platnosci");
        setBusy(null);
      }
    } catch {
      alert("Blad sieci");
      setBusy(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-beige/20 bg-card shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-beige/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-beige" />
            <h2 className="text-base font-semibold">Kup kredyty</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Products */}
        <div className="grid gap-3 p-6">
          {STRIPE_PRODUCTS.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-xl border p-4 ${
                i === 1
                  ? "border-beige/40 bg-beige/5"
                  : "border-beige/10 bg-background/30"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{p.name}</p>
                  {i === 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-beige/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-beige">
                      <Sparkles className="h-2.5 w-2.5" />
                      Polecany
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {p.points.toLocaleString("pl-PL")} kredytow
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <ul className="flex items-center gap-1">
                    {["Nie wygasaja", "Wszystkie modele"].map((f) => (
                      <li key={f} className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Check className="h-2.5 w-2.5 text-beige/60" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <button
                type="button"
                onClick={() => buy(p.id)}
                disabled={busy === p.id}
                className={`ml-4 shrink-0 inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                  i === 1
                    ? "bg-beige text-beige-foreground hover:bg-beige/90"
                    : "border border-beige/20 text-foreground hover:border-beige/40"
                } disabled:opacity-60`}
              >
                {busy === p.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                {formatAmount(p.amountCents, p.currency)}
              </button>
            </div>
          ))}
        </div>

        <p className="border-t border-beige/10 px-6 py-3 text-center text-xs text-muted-foreground">
          BLIK, karta, Apple Pay. Ceny brutto.
        </p>
      </div>
    </div>
  );
}
