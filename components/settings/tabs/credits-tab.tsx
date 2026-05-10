"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Coins, ExternalLink } from "lucide-react";
import { STRIPE_PRODUCTS } from "@/lib/stripe-products";

type PointsResponse = { points: number };

export function CreditsTab() {
  const [points, setPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/points", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("nope"))))
      .then((data: PointsResponse) => {
        if (!cancelled) setPoints(data.points ?? 0);
      })
      .catch(() => {
        if (!cancelled) setPoints(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleBuy(productId: string) {
    setCheckoutLoading(productId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      alert(data.error ?? "Nie udalo sie rozpoczac platnosci");
    } catch {
      alert("Blad sieci");
    } finally {
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-medium text-foreground">Kredyty</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kredyty to nasza waluta generowania. Kazdy model AI ma swoj
          koszt — wybierz pakiet, ktory najlepiej dopasujesz do swojego
          tempa pracy.
        </p>
      </header>

      <section className="rounded-lg border border-beige/15 bg-background/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-beige/10">
              <Coins className="h-5 w-5 text-beige" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Saldo
              </p>
              <p className="font-mono text-lg text-foreground">
                {loading ? "..." : `${points ?? 0} kredytow`}
              </p>
            </div>
          </div>
          <Link
            href="/pricing"
            className="inline-flex h-8 items-center gap-1 rounded-md border border-beige/20 px-3 text-xs text-beige/90 transition hover:border-beige/40 hover:bg-white/5"
          >
            Wszystkie pakiety
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        {STRIPE_PRODUCTS.map((p) => (
          <article
            key={p.id}
            className="flex flex-col rounded-xl border border-beige/10 bg-background/40 p-4"
          >
            <header>
              <p className="text-sm font-medium text-foreground">{p.name}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {(p.amountCents / 100).toFixed(0)} zl
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.description}
              </p>
            </header>
            <p className="mt-3 font-mono text-sm text-beige">
              {p.points.toLocaleString("pl-PL")} kredytow
            </p>
            <button
              type="button"
              onClick={() => handleBuy(p.id)}
              disabled={checkoutLoading !== null}
              className="mt-4 inline-flex h-8 w-full items-center justify-center rounded-md bg-beige text-xs font-medium text-beige-foreground transition hover:bg-beige/90 disabled:opacity-50"
            >
              {checkoutLoading === p.id ? "Trwa..." : "Kup"}
            </button>
          </article>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Platnosci obsluguje Stripe. Akceptujemy karty, BLIK i Przelewy24.
      </p>
    </div>
  );
}
