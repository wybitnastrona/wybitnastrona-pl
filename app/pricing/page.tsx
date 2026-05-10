import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { PricingClient } from "@/components/pricing/pricing-client";
import { STRIPE_PRODUCTS } from "@/lib/stripe-products";

export const metadata = {
  title: "Pricing - wybitnastrona.pl",
  description:
    "Plany cenowe wybitnastrona.pl. Pakiety punktow i subskrypcje miesieczne.",
};

export default function PricingPage() {
  // Server-side: przekazujemy do klienta tylko serializowalne pola.
  const topups = STRIPE_PRODUCTS.filter((p) => p.type === "topup");
  const subs = STRIPE_PRODUCTS.filter((p) => p.type === "subscription");

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
              Pakiety punktów i subskrypcje
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground">
              Płać tylko za to, czego używasz. BLIK, karta i Apple Pay — wszystko obsługiwane.
            </p>
          </div>

          <PricingClient topups={topups} subs={subs} />

          <p className="mt-10 text-center text-xs text-muted-foreground">
            Ceny brutto. Faktury VAT dostępne po podaniu NIP w panelu klienta.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
