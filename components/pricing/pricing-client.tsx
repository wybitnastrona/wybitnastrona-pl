"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { formatAmount, type StripeProduct } from "@/lib/stripe-products";

type Props = {
  topups: StripeProduct[];
  /** Kept for API compat — unused after subscription removal. */
  subs?: StripeProduct[];
};

export function PricingClient({ topups }: Props) {
  const { user, openAuth } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

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
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Zap className="h-4 w-4 text-beige" />
        <h2 className="text-lg font-medium">Pakiety kredytow</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {topups.map((p, i) => (
          <ProductCard
            key={p.id}
            product={p}
            highlighted={i === 1}
            busy={busy === p.id}
            onClick={() => buy(p.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  highlighted,
  busy,
  onClick,
}: {
  product: StripeProduct;
  highlighted: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`flex flex-col gap-5 rounded-2xl border p-6 ${
        highlighted
          ? "border-beige/50 bg-card shadow-2xl shadow-beige/5"
          : "border-beige/10 bg-card/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{product.name}</h3>
        {highlighted && (
          <span className="inline-flex items-center gap-1 rounded-full bg-beige/15 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-beige">
            <Sparkles className="h-3 w-3" />
            Polecany
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-medium tracking-tight">
          {formatAmount(product.amountCents, product.currency)}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">{product.description}</p>

      <ul className="space-y-2">
        {buildFeatures(product).map((f) => (
          <li
            key={f}
            className="flex items-start gap-2 text-sm text-foreground/90"
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-beige" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={`mt-auto inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition ${
          highlighted
            ? "bg-beige text-beige-foreground hover:bg-beige/90"
            : "border border-beige/20 text-foreground hover:border-beige/40 hover:text-beige"
        } disabled:opacity-60`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Kup pakiet
      </button>
    </div>
  );
}

function buildFeatures(p: StripeProduct): string[] {
  return [
    `${p.points.toLocaleString("pl-PL")} kredytow na koncie`,
    "Kredyty nie wygasaja",
    "Wszystkie modele AI dostepne",
    "BLIK, karta, Apple Pay",
  ];
}
