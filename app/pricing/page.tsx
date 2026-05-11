import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { PricingClient } from "@/components/pricing/pricing-client";
import { getSubscriptions, getTopupPacks } from "@/lib/stripe-products";

export const metadata = {
  title: "Cennik - wybitnastrona.pl",
  description:
    "Plany FREE / PRO / WYBITNY. Najbardziej zaawansowane AI do budowania aplikacji Apple — iPhone, iPad, Watch, TV, Vision Pro.",
};

export default function PricingPage() {
  const subscriptions = getSubscriptions();
  const topups = getTopupPacks();

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mb-10 text-center">
            <span className="inline-block rounded-full border border-beige/20 bg-card/60 px-3 py-1 text-xs uppercase tracking-wider text-beige/80">
              Cennik
            </span>
            <h1 className="mt-4 text-balance text-4xl font-medium tracking-tight sm:text-5xl">
              Buduj <span className="italic text-beige">wybitne</span> aplikacje
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-balance text-muted-foreground">
              Od bezplatnego startu po najbardziej zaawansowane AI do aplikacji
              Apple. Wybierz plan, zaczniesz w 30 sekund.
            </p>
          </div>

          <PricingClient subscriptions={subscriptions} topups={topups} />

          <div className="mt-12 rounded-2xl border border-beige/10 bg-card/40 p-6 text-center">
            <p className="text-sm font-medium text-foreground">Jak to dziala?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Kazda generacja AI kosztuje od{" "}
              <strong className="text-foreground">10 kredytow</strong> (Haiku —
              szybki) do <strong className="text-foreground">80 kredytow</strong>{" "}
              (Opus 4.7 — maksymalna jakosc). Modele dostepne wedlug planu.
              Kredyty z subskrypcji odswiezaja sie co miesiac, doladowania nie
              wygasaja.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Ceny brutto. Faktury VAT po podaniu NIP w panelu klienta. Anulowanie subskrypcji w kazdej chwili.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
