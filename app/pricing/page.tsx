import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { PricingClient } from "@/components/pricing/pricing-client";
import { STRIPE_PRODUCTS } from "@/lib/stripe-products";

export const metadata = {
  title: "Kredyty - wybitnastrona.pl",
  description:
    "Pakiety kredytow wybitnastrona.pl. Plac tylko za to, czego uzywasz.",
};

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mb-12 text-center">
            <span className="inline-block rounded-full border border-beige/20 bg-card/60 px-3 py-1 text-xs uppercase tracking-wider text-beige/80">
              Kredyty
            </span>
            <h1 className="mt-4 text-balance text-4xl font-medium tracking-tight sm:text-5xl">
              Kup kredyty, buduj bez limitów
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-balance text-muted-foreground">
              Plac tylko za to, czego uzywasz. Kredyty nie wygasaja. BLIK, karta i Apple Pay.
            </p>
          </div>

          <PricingClient topups={STRIPE_PRODUCTS} subs={[]} />

          <div className="mt-12 rounded-2xl border border-beige/10 bg-card/40 p-6 text-center">
            <p className="text-sm font-medium text-foreground">Jak to dziala?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Kazda generacja AI kosztuje od <strong className="text-foreground">10 kredytow</strong> (Haiku — szybki) do <strong className="text-foreground">80 kredytow</strong> (Opus 4.7 — maksymalna jakosc).
              Mozesz zmieniac model dla kazdego projektu oddzielnie.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Ceny brutto. Faktury VAT dostepne po podaniu NIP w panelu klienta.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
