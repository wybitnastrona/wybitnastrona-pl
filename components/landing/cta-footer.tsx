import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaFooter() {
  return (
    <section className="border-t border-beige/10 bg-background py-20 sm:py-28">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 text-center">
        <h2 className="text-balance text-4xl font-medium tracking-tight sm:text-5xl md:text-6xl">
          Zbuduj swoja{" "}
          <span className="text-beige">wybitna strone</span> w 60 sekund
        </h2>
        <p className="mt-4 text-balance text-base text-muted-foreground sm:text-lg">
          Bez instalowania, bez konfiguracji. Wpisz pomysl i zobacz dzialajaca
          strone na zywo.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/#hero"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-beige px-5 text-sm font-medium text-beige-foreground transition hover:bg-beige/90"
          >
            Sprobuj teraz
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-medium text-foreground/80 transition hover:text-beige"
          >
            Zobacz plany
          </Link>
        </div>
      </div>
    </section>
  );
}
