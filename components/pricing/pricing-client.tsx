"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Info, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { PRO_TIERS, RECOMMENDED_PRO_TIER_ID } from "@/lib/stripe-products";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Tekst wyjasnienia proraty - uzywany w 2 miejscach (pricing-client + credits-tab),
 * trzymamy w jednym miejscu zeby slowo "proporcjonalne rozliczenie Stripe" bylo
 * zawsze identyczne (latwiej tlumaczyc / zmieniac copywriting).
 */
const PRORATION_HINT =
  "Kwota zostanie pomniejszona o niewykorzystany czas obecnego planu (proporcjonalne rozliczenie Stripe).";

/**
 * Item 21: tekst wyjaśniający okres karencji po anulowaniu - pokazujemy
 * gdy `subscription.cancel_at_period_end === true`. User wciąż ma dostęp
 * do PRO do końca opłaconego cyklu, Stripe nie pobiera proraty zwrotnej.
 */
const CANCEL_GRACE_HINT =
  "Po anulowaniu zachowujesz dostęp do PRO do końca opłaconego okresu rozliczeniowego. Stripe nie pobiera proraty zwrotnej za niewykorzystany czas.";

const PRO_FEATURES = [
  "Wszystkie modele AI: Pan Programista (Sonnet 4.6), Opus 4.6, Opus 4.7",
  "Web, Android, iOS oraz Watch / TV / Vision Pro",
  "Custom subdomena (twoja-nazwa.wybitny.website)",
  "Projekty prywatne - pełna kontrola dostępu",
  "Eksport ZIP i push do GitHub",
  "Integracje: Supabase, Notion, Stripe",
  "Priorytetowy support",
  "Bez reklam, bez limitów dziennych",
];

export function PricingClient() {
  const { user, openAuth } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  // `isPro` decyduje czy pokazujemy tooltip o proracie - dla nowych klientow
  // Stripe nie naliczy zwrotu za "niewykorzystany czas obecnego planu",
  // wiec wyswietlanie tej informacji byloby mylace.
  const [isPro, setIsPro] = useState(false);
  // Item 21: `cancelAtPeriodEnd` - PRO user anulował, ale jest jeszcze
  // w opłaconym okresie. Pokazujemy mu wtedy informację o karencji.
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsPro(false);
      setCancelAtPeriodEnd(false);
      return;
    }
    let cancelled = false;
    fetch("/api/me/points", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("nope"))))
      .then(
        (data: { isPro?: boolean; cancelAtPeriodEnd?: boolean }) => {
          if (cancelled) return;
          setIsPro(Boolean(data.isPro));
          setCancelAtPeriodEnd(Boolean(data.cancelAtPeriodEnd));
        },
      )
      .catch(() => {
        if (!cancelled) {
          setIsPro(false);
          setCancelAtPeriodEnd(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Default = recommended tier (drugi od najtanszego - psychologia anchoring).
  const defaultIndex = Math.max(
    0,
    PRO_TIERS.findIndex((t) => t.id === RECOMMENDED_PRO_TIER_ID),
  );
  const [tierIndex, setTierIndex] = useState<number>(defaultIndex);
  const selectedTier = PRO_TIERS[tierIndex] ?? PRO_TIERS[0];

  const perCredit = useMemo(
    () => selectedTier.pln / selectedTier.credits,
    [selectedTier],
  );

  async function buy() {
    if (!user) {
      openAuth({ mode: "login" });
      return;
    }
    setBusy(selectedTier.id);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedTier.id }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.assign(data.url);
      } else {
        alert(data.error ?? "Nie udalo sie rozpoczac płatności");
        setBusy(null);
      }
    } catch {
      alert("Blad sieci");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-6 flex flex-col gap-2 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-beige/80">
            Plany
          </p>
          <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Wybierz moc, której potrzebujesz
          </h2>
          <p className="text-sm text-muted-foreground">
            Suwakiem dobierzesz idealną ilość kredytów. Ceny brutto za miesiąc.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <FreeTierCard />

          {/* PRO - jedna karta z suwakiem */}
          <ProSliderCard
            tierIndex={tierIndex}
            onTierIndexChange={setTierIndex}
            busy={!!busy}
            onBuy={buy}
            perCredit={perCredit}
            isPro={isPro}
            cancelAtPeriodEnd={cancelAtPeriodEnd}
          />
        </div>

        {/* Item 21: banner karencji dla anulujących userów - widoczny tylko
            gdy isPro && cancelAtPeriodEnd, żeby nowi userzy go nie widzieli. */}
        {isPro && cancelAtPeriodEnd && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4 text-sm text-amber-200/90">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{CANCEL_GRACE_HINT}</p>
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Płatność miesięczna obsługiwana przez Stripe. Możesz anulować w
          dowolnym momencie. Custom subdomena cofa się do auto-generowanej po
          anulowaniu (kredyty wygenerowanego okresu nie są zwracane).
        </p>
      </section>
    </div>
  );
}

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
        <span className="text-4xl font-medium tracking-tight">0 zł</span>
        <span className="text-xs text-muted-foreground">/ mc</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Wypróbuj kreator. Limit 1500 kr/mc i 800 kr/dzień.
      </p>
      <ul className="space-y-2 text-sm text-foreground/90">
        <Feature>Strony web (React + Vite + Tailwind)</Feature>
        <Feature>1500 kredytów / mc, 800 / dzień</Feature>
        <Feature>Domyślny model: Pan Programista (Sonnet 4.6)</Feature>
        <Feature>Auto-subdomena {`{slug}.wybitny.website`}</Feature>
        <Feature>Projekty prywatne</Feature>
      </ul>
      <span className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-beige/15 px-4 text-sm font-medium text-muted-foreground">
        Aktywny przy rejestracji
      </span>
    </div>
  );
}

function ProSliderCard({
  tierIndex,
  onTierIndexChange,
  busy,
  onBuy,
  perCredit,
  isPro,
  cancelAtPeriodEnd,
}: {
  tierIndex: number;
  onTierIndexChange: (i: number) => void;
  busy: boolean;
  onBuy: () => void;
  perCredit: number;
  isPro: boolean;
  cancelAtPeriodEnd?: boolean;
}) {
  // Trzymamy zmienną mimo że na razie nie jest renderowana - prop drilling dla
  // potencjalnych przyszłych rozszerzeń (badge "Anulowane" na karcie).
  void cancelAtPeriodEnd;
  const tier = PRO_TIERS[tierIndex] ?? PRO_TIERS[0];
  const isRecommended = tier.id === RECOMMENDED_PRO_TIER_ID;
  return (
    <div className="relative flex flex-col gap-5 rounded-2xl border border-beige/50 bg-card p-6 shadow-2xl shadow-beige/5">
      {isRecommended && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-beige/40 bg-gradient-to-r from-beige via-amber-100 to-beige px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-neutral-900">
          Najczęściej wybierany
        </span>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">PRO</h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-beige/15 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-beige">
          <Sparkles className="h-3 w-3" />
          Pełna moc
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-medium tracking-tight">{tier.pln} zł</span>
          <span className="text-xs text-muted-foreground">/ mc brutto</span>
          {isPro && (
            <Tooltip>
              <TooltipTrigger
                aria-label="Informacja o proporcjonalnym rozliczeniu"
                className="ml-1 inline-flex cursor-help items-center text-muted-foreground transition hover:text-beige"
              >
                <Info className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>{PRORATION_HINT}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{tier.credits.toLocaleString("pl-PL")} kredytów/mc</span>
          <span>≈ {(perCredit * 100).toFixed(2)} gr/kr</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <input
          type="range"
          min={0}
          max={PRO_TIERS.length - 1}
          step={1}
          value={tierIndex}
          onChange={(e) => onTierIndexChange(Number(e.target.value))}
          aria-label="Wybierz pakiet kredytów"
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-beige/15 accent-beige"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{PRO_TIERS[0].credits.toLocaleString("pl-PL")} kr</span>
          <span>
            {PRO_TIERS[PRO_TIERS.length - 1].credits.toLocaleString("pl-PL")} kr
          </span>
        </div>
      </div>

      <ul className="space-y-2 text-sm text-foreground/90">
        {PRO_FEATURES.map((f) => (
          <Feature key={f}>{f}</Feature>
        ))}
      </ul>

      <button
        type="button"
        onClick={onBuy}
        disabled={busy}
        className="mt-auto inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-beige px-4 text-sm font-medium text-beige-foreground transition hover:bg-beige/90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Aktywuj PRO - {tier.pln} zł / mc
      </button>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-beige" />
      <span>{children}</span>
    </li>
  );
}
