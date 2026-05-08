import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Pricing - wybitnastrona.pl",
  description:
    "Plany cenowe wybitnastrona.pl. Generuj strony AI od planu darmowego po Teams.",
};

const PLANS = [
  {
    name: "Free",
    price: "0 zl",
    cadence: "/mc",
    description: "Sprawdz jak to dziala. Bez zobowiazan.",
    cta: { label: "Zacznij za darmo", href: "/" },
    features: [
      "10 generowan miesiecznie",
      "Sandpack preview na zywo",
      "Eksport do ZIP",
      "1 publiczna subdomena",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "19 zl",
    cadence: "/mc",
    description: "Dla freelancerow i tworcow ktorzy buduja regularnie.",
    cta: { label: "Wybierz Pro (wkrotce)", href: "#" },
    features: [
      "200 generowan miesiecznie",
      "Wszystkie modele Claude (w tym Opus)",
      "10 publicznych subdomen",
      "Custom domain (wkrotce)",
      "Priorytetowy support",
    ],
    highlighted: true,
  },
  {
    name: "Teams",
    price: "49 zl",
    cadence: "/mc / user",
    description: "Wspolpraca dla zespolow projektowych i agencji.",
    cta: { label: "Skontaktuj sie", href: "mailto:hello@wybitnastrona.pl" },
    features: [
      "Nielimitowane generowania",
      "Wspolpraca w czasie rzeczywistym",
      "Centralne billing i fakturowanie",
      "SSO + audit log",
      "Dedykowany account manager",
    ],
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mb-12 text-center">
            <span className="inline-block rounded-full border border-beige/20 bg-card/60 px-3 py-1 text-xs uppercase tracking-wider text-beige/80">
              Pricing
            </span>
            <h1 className="mt-4 text-balance text-4xl font-medium tracking-tight sm:text-5xl md:text-6xl">
              Plany dopasowane do Ciebie
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground">
              Zacznij za darmo, skaluj jak tylko poczujesz wartosc.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col gap-5 rounded-2xl border p-6 ${
                  plan.highlighted
                    ? "border-beige/50 bg-card shadow-2xl shadow-beige/5"
                    : "border-beige/10 bg-card/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">{plan.name}</h2>
                  {plan.highlighted && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-beige/15 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-beige">
                      <Sparkles className="h-3 w-3" />
                      Popularny
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-medium tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {plan.cadence}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>

                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-foreground/90"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-beige" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.cta.href}
                  className={`mt-auto inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition ${
                    plan.highlighted
                      ? "bg-beige text-beige-foreground hover:bg-beige/90"
                      : "border border-beige/20 text-foreground hover:border-beige/40 hover:text-beige"
                  }`}
                >
                  {plan.cta.label}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            Wszystkie ceny netto. VAT 23 procent doliczany na fakturze.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
