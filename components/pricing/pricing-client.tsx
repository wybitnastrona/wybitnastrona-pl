"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { formatAmount, type StripeProduct } from "@/lib/stripe-products";

type Props = {
  subscriptions: StripeProduct[];
  topups: StripeProduct[];
};

export function PricingClient({ subscriptions, topups }: Props) {
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
    <div className="flex flex-col gap-12">
      {/* Plany — 3 kolumny: FREE / PRO / WYBITNY */}
      <section>
        <div className="mb-6 flex flex-col gap-2 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-beige/80">
            Plany
          </p>
          <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Wybierz moc, ktorej potrzebujesz
          </h2>
          <p className="text-sm text-muted-foreground">
            Od bezplatnego startu po najbardziej zaawansowane AI do aplikacji Apple.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* FREE — plan informacyjny */}
          <FreeTierCard />

          {/* PRO + WYBITNY z STRIPE_PRODUCTS */}
          {subscriptions.map((p) => (
            <SubscriptionCard
              key={p.id}
              product={p}
              busy={busy === p.id}
              onClick={() => buy(p.id)}
            />
          ))}
        </div>
      </section>

      {/* One-time top-up packs */}
      <section>
        <div className="mb-6 flex items-center gap-2">
          <Zap className="h-4 w-4 text-beige" />
          <h2 className="text-lg font-medium">Dodatkowe kredyty (jednorazowo)</h2>
          <span className="text-xs text-muted-foreground">
            — bez subskrypcji, kredyty nie wygasaja
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {topups.map((p, i) => (
            <TopupCard
              key={p.id}
              product={p}
              highlighted={i === 1}
              busy={busy === p.id}
              onClick={() => buy(p.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Free tier ────────────────────────────────────────────────────────────────

function FreeTierCard() {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-beige/10 bg-card/40 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">FREE</h3>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Bez karty
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-medium tracking-tight">$0</span>
        <span className="text-xs text-muted-foreground">/ mc</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Wyprobuj — wszystkie podstawowe funkcje.
      </p>
      <ul className="space-y-2 text-sm text-foreground/90">
        <Feature>Strony internetowe (React + Vite + Tailwind)</Feature>
        <Feature>5 kredytow / miesiac</Feature>
        <Feature>Model Claude Haiku 4.5 (Auto)</Feature>
        <Feature>Projekty publiczne</Feature>
        <Feature>Subdomena {`{slug}.wybitny.website`}</Feature>
      </ul>
      <span className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-beige/15 px-4 text-sm font-medium text-muted-foreground">
        Aktywny przy rejestracji
      </span>
    </div>
  );
}

// ─── Subscription card (PRO / WYBITNY) ────────────────────────────────────────

function SubscriptionCard({
  product,
  busy,
  onClick,
}: {
  product: StripeProduct;
  busy: boolean;
  onClick: () => void;
}) {
  const isWybitny = product.tier === "wybitny";
  const isPro = product.tier === "pro";

  return (
    <div
      className={`relative flex flex-col gap-5 rounded-2xl border p-6 ${
        isWybitny
          ? "border-amber-300/40 bg-gradient-to-br from-amber-100/[0.05] via-card to-beige/[0.04] shadow-2xl shadow-amber-200/5"
          : product.highlight
            ? "border-beige/50 bg-card shadow-2xl shadow-beige/5"
            : "border-beige/10 bg-card/60"
      }`}
    >
      {isWybitny && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-amber-300/40 bg-gradient-to-r from-amber-200 via-beige to-amber-100 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-neutral-900">
          Najbardziej zaawansowane AI Apple
        </span>
      )}

      <div className="flex items-center justify-between">
        <h3
          className={`text-lg font-medium ${
            isWybitny ? "text-amber-100" : ""
          }`}
        >
          {product.name}
        </h3>
        {isPro && (
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
        <span className="text-xs text-muted-foreground">/ mc</span>
      </div>

      <p className="text-sm text-muted-foreground">{product.description}</p>

      <ul className="space-y-2 text-sm text-foreground/90">
        {(product.features ?? []).map((f) => (
          <Feature key={f}>{f}</Feature>
        ))}
      </ul>

      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={`mt-auto inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition disabled:opacity-60 ${
          isWybitny
            ? "bg-gradient-to-r from-amber-200 via-beige to-amber-100 text-neutral-900 hover:from-amber-100 hover:via-beige hover:to-amber-100"
            : isPro
              ? "bg-beige text-beige-foreground hover:bg-beige/90"
              : "border border-beige/20 text-foreground hover:border-beige/40 hover:text-beige"
        }`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isWybitny ? "Aktywuj WYBITNY" : "Aktywuj PRO"}
      </button>
    </div>
  );
}

// ─── Top-up card (one-time) ────────────────────────────────────────────────────

function TopupCard({
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
      className={`flex flex-col gap-4 rounded-2xl border p-6 ${
        highlighted
          ? "border-beige/40 bg-card shadow-xl shadow-beige/5"
          : "border-beige/10 bg-card/60"
      }`}
    >
      <h3 className="text-base font-medium">{product.name}</h3>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-medium tracking-tight">
          {formatAmount(product.amountCents, product.currency)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{product.description}</p>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={`mt-auto inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-xs font-medium transition disabled:opacity-60 ${
          highlighted
            ? "bg-beige text-beige-foreground hover:bg-beige/90"
            : "border border-beige/20 text-foreground hover:border-beige/40 hover:text-beige"
        }`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Kup
      </button>
    </div>
  );
}

// ─── Helper ────────────────────────────────────────────────────────────────────

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-beige" />
      <span>{children}</span>
    </li>
  );
}
