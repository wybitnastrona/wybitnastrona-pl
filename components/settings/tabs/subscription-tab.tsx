"use client";

import Link from "next/link";
import { Check } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "0 zl",
    cadence: "/ miesiac",
    description: "Dla osob, ktore zaczynaja przygode z budowaniem stron.",
    cta: "Twoj aktualny plan",
    ctaDisabled: true,
    features: [
      "Generator stron z AI",
      "Publiczne projekty",
      "Subdomena na wybitny.host",
      "Limit 1 mln tokenow / miesiac",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "99 zl",
    cadence: "/ miesiac",
    description: "Dla freelancerow i malych zespolow.",
    cta: "Ulepsz do Pro",
    highlight: true,
    features: [
      "Wszystko z Free",
      "Wlasna domena (CNAME)",
      "Prywatne projekty",
      "10 mln tokenow / miesiac",
      "Brak brandingu wybitnastrona",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "299 zl",
    cadence: "/ miesiac",
    description: "Wspolpraca w zespole + role.",
    cta: "Zaloz zespol",
    features: [
      "Wszystko z Pro",
      "Wspoldzielenie projektow",
      "Role i uprawnienia",
      "Centralne rozliczenia",
    ],
  },
];

export function SubscriptionTab() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-medium text-foreground">
          Subskrypcja i tokeny
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Twoj aktualny plan oraz dostepne pakiety. Nastepne odswiezenie
          tokenow: pierwszy dzien miesiaca.
        </p>
      </header>

      <section className="rounded-lg border border-beige/15 bg-background/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Aktualny plan
            </p>
            <p className="mt-1 text-base font-medium text-foreground">Free</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Wykorzystanie
            </p>
            <p className="mt-1 font-mono text-sm text-foreground">
              0 / 1 000 000 tokenow
            </p>
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[1%] bg-beige" />
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        {PLANS.map((plan) => (
          <article
            key={plan.id}
            className={`flex flex-col rounded-xl border bg-background/40 p-4 ${
              plan.highlight
                ? "border-beige/40 shadow-[0_0_0_1px_var(--beige)]"
                : "border-beige/10"
            }`}
          >
            <header>
              <p className="text-sm font-medium text-foreground">
                {plan.name}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {plan.price}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {plan.cadence}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {plan.description}
              </p>
            </header>
            <ul className="mt-3 flex-1 space-y-1.5">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-1.5 text-xs text-foreground/80"
                >
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-beige/80" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-4">
              {plan.ctaDisabled ? (
                <span className="inline-flex h-8 items-center justify-center rounded-md border border-beige/20 px-3 text-xs text-muted-foreground">
                  {plan.cta}
                </span>
              ) : (
                <Link
                  href="/pricing"
                  className={`inline-flex h-8 w-full items-center justify-center rounded-md text-xs font-medium transition ${
                    plan.highlight
                      ? "bg-beige text-beige-foreground hover:bg-beige/90"
                      : "border border-beige/20 text-beige/90 hover:border-beige/40 hover:bg-white/5"
                  }`}
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
