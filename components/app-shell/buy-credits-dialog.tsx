"use client";

/**
 * BuyCreditsDialog — zakup kredytów jednorazowo.
 *
 * Wizualnie odświeżony: karty pakietów, kalkulator koszt modeli,
 * przelicznik 1 kredyt = 0.02 PLN (50 kr = 1 PLN).
 */

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Loader2, Sparkles, X, Zap } from "lucide-react";
import { getTopupPacks, formatAmount } from "@/lib/stripe-products";
import { AI_MODELS, CREDITS_PER_PLN } from "@/lib/ai-models";
import { useAuth } from "@/components/auth/auth-provider";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function BuyCreditsDialog({ open, onClose }: Props) {
  const { user, openAuth } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [showCalc, setShowCalc] = useState(false);

  const packs = getTopupPacks();

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
        alert(data.error ?? "Nie udało się rozpocząć płatności");
        setBusy(null);
      }
    } catch {
      alert("Błąd sieci");
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
        <div className="flex items-start justify-between border-b border-beige/10 p-5">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-beige" />
              <h2 className="text-lg font-medium text-foreground">Kup Kredyty</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              1 kredyt = 0.02 zł · Kredyty nie wygasają · BLIK, karta, Apple Pay
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Pakiety */}
        <div className="grid gap-3 p-5">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className={`relative flex items-center justify-between gap-3 rounded-xl border p-4 transition ${
                pack.highlight
                  ? "border-beige/50 bg-beige/[0.06] shadow-md shadow-beige/5"
                  : "border-beige/15 bg-background/40 hover:border-beige/25"
              }`}
            >
              {pack.highlight && (
                <div className="absolute -top-2.5 left-4">
                  <span className="inline-flex items-center gap-1 rounded-full border border-beige/30 bg-beige/15 px-2 py-0.5 text-[9px] font-medium uppercase tracking-widest text-beige">
                    <Sparkles className="h-2.5 w-2.5" />
                    Polecany
                  </span>
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{pack.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{pack.description}</p>
                {pack.features && pack.features.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {pack.features.map((f) => (
                      <li key={f} className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
                        <Check className="h-3 w-3 shrink-0 text-beige/60" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span className="text-lg font-medium text-foreground">
                  {formatAmount(pack.amountCents, pack.currency)}
                </span>
                <button
                  type="button"
                  onClick={() => buy(pack.id)}
                  disabled={busy === pack.id}
                  className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition disabled:opacity-60 ${
                    pack.highlight
                      ? "bg-beige text-beige-foreground hover:bg-beige/90"
                      : "border border-beige/20 text-foreground hover:border-beige/40 hover:bg-white/5"
                  }`}
                >
                  {busy === pack.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  Kup
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Kalkulator kosztów modeli */}
        <div className="border-t border-beige/10 px-5 pb-5">
          <button
            type="button"
            onClick={() => setShowCalc((v) => !v)}
            className="flex w-full cursor-pointer items-center justify-between py-3 text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-beige/70" />
              Ile kosztuje każdy model AI?
            </span>
            {showCalc ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showCalc && (
            <div className="rounded-lg border border-beige/10 bg-background/40 overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-beige/10 bg-beige/5 text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Model</th>
                    <th className="px-3 py-2 text-right font-medium">Kredyty</th>
                    <th className="px-3 py-2 text-right font-medium">Koszt</th>
                    <th className="px-3 py-2 text-left font-medium">Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {AI_MODELS.filter((m) => m.available).map((m, i) => (
                    <tr
                      key={m.id}
                      className={`border-b border-beige/5 ${i % 2 === 0 ? "bg-transparent" : "bg-beige/[0.02]"}`}
                    >
                      <td className="px-3 py-2 text-foreground/90">
                        <div className="flex items-center gap-1.5">
                          {m.badge && (
                            <span className="rounded bg-beige/15 px-1 py-px text-[8px] uppercase tracking-wider text-beige">
                              {m.badge === "fast" ? "Szybki" : m.badge === "powerful" ? "Mocny" : "Nowy"}
                            </span>
                          )}
                          {m.labelShort}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-foreground">
                        {m.pointCost}
                      </td>
                      <td className="px-3 py-2 text-right text-beige/80">
                        {((m.pointCost / CREDITS_PER_PLN)).toFixed(2)} zł
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded-full border border-beige/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                          {m.requiresTier}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-3 py-2 text-[10px] text-muted-foreground">
                Koszty orientacyjne przy typowej generacji (~50 000 tokenów). Przy krótszych
                rozmowach lub prostych zmianach realne zużycie jest niższe.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
