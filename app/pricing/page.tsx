import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { PricingClient } from "@/components/pricing/pricing-client";

export const metadata = {
  title: "Cennik - wybitnastrona.pl",
  description:
    "FREE i PRO — jedna subskrypcja, suwakiem dobierzesz idealną ilość kredytów. Bez ukrytych kosztów, ceny brutto.",
};

export default function PricingPage() {
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
              Jeden plan PRO. Suwakiem dobierzesz idealną ilość kredytów na
              miesiąc — od 500 po 96&nbsp;000 kr/mc.
            </p>
          </div>

          <PricingClient />

          <div className="mt-12 rounded-2xl border border-beige/10 bg-card/40 p-6 text-center">
            <p className="text-sm font-medium text-foreground">Jak to działa?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Każda generacja AI kosztuje od{" "}
              <strong className="text-foreground">30 kredytów</strong> (Haiku 4.5
              — szybki) do <strong className="text-foreground">1200 kredytów</strong>{" "}
              (Opus 4.7 — najwyższa jakość). Kredyty z subskrypcji odświeżają
              się co miesiąc. Bez doładowań jednorazowych — większe pakiety w
              suwaku.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Ceny brutto. Faktury VAT po podaniu NIP w panelu klienta. Anulowanie
            subskrypcji w każdej chwili. Po anulowaniu custom subdomena wraca do
            auto-generowanej.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
