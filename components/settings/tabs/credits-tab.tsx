"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Coins, Copy, ExternalLink, Gift, Info } from "lucide-react";
import { STRIPE_PRODUCTS } from "@/lib/stripe-products";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** @see components/pricing/pricing-client.tsx */
const PRORATION_HINT =
  "Kwota zostanie pomniejszona o niewykorzystany czas obecnego planu (proporcjonalne rozliczenie Stripe).";

type PointsResponse = { points: number; isPro?: boolean };

export function CreditsTab() {
  const [points, setPoints] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/points", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("nope"))))
      .then((data: PointsResponse) => {
        if (cancelled) return;
        setPoints(data.points ?? 0);
        setIsPro(Boolean(data.isPro));
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
              <div className="mt-1 flex items-center gap-1.5">
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  {(p.amountCents / 100).toFixed(0)} zl
                </p>
                {isPro && (
                  <Tooltip>
                    <TooltipTrigger
                      aria-label="Informacja o proporcjonalnym rozliczeniu"
                      className="inline-flex cursor-help items-center text-muted-foreground transition hover:text-beige"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </TooltipTrigger>
                    <TooltipContent>{PRORATION_HINT}</TooltipContent>
                  </Tooltip>
                )}
              </div>
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

      <ReferralSection />

      <p className="text-[11px] text-muted-foreground">
        Platnosci obsluguje Stripe. Akceptujemy karty, BLIK i Przelewy24.
      </p>
    </div>
  );
}

type ReferralRow = {
  id: string;
  referee_id: string;
  referee_first_payment_at: string | null;
  reward_credits: number;
  awarded_at: string | null;
  created_at: string;
};

function ReferralSection() {
  const [code, setCode] = useState<string | null>(null);
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [total, setTotal] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/referrals", { cache: "no-store" })
      .then((r) => r.json())
      .then(
        (data: {
          referralCode?: string | null;
          referrals?: ReferralRow[];
          totalRewards?: number;
        }) => {
          if (cancelled) return;
          setCode(data.referralCode ?? null);
          setRows(data.referrals ?? []);
          setTotal(data.totalRewards ?? 0);
        },
      )
      .catch(() => {
        // ignore
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const link =
    typeof window !== "undefined" && code
      ? `${window.location.origin}/r/${code}`
      : "";

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <section className="rounded-lg border border-beige/15 bg-background/40 p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
            <Gift className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">
              Program poleceń
            </h3>
            <p className="text-xs text-muted-foreground">
              Polec znajomego — gdy dokona pierwszej płatności, otrzymujesz{" "}
              <span className="font-mono text-beige">300 kredytów</span>.
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Zarobione
          </p>
          <p className="font-mono text-sm text-foreground">{total} kr</p>
        </div>
      </header>

      <div className="mb-3 flex items-center gap-2 rounded-md border border-beige/10 bg-card/40 px-2 py-1.5">
        <code className="flex-1 truncate font-mono text-[11px] text-beige/80">
          {link || "Wczytuję link…"}
        </code>
        <button
          type="button"
          onClick={copyLink}
          disabled={!link}
          className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-beige/15 px-2 text-[11px] text-muted-foreground transition hover:border-beige/30 hover:text-beige disabled:opacity-50"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Skopiowano
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Kopiuj
            </>
          )}
        </button>
      </div>

      {rows.length > 0 && (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-md border border-beige/10 bg-card/30 px-2.5 py-1.5 text-[11px]"
            >
              <span className="font-mono text-muted-foreground">
                {r.referee_id.slice(0, 8)}…
              </span>
              {r.awarded_at ? (
                <span className="inline-flex items-center gap-1 text-emerald-300">
                  <Check className="h-2.5 w-2.5" />
                  Nagroda +{r.reward_credits} kr
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Oczekuje na pierwszą płatność
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
