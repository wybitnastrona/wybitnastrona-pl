import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { TemplatesGrid } from "@/components/templates/templates-grid";
import { PROMPTS_LIBRARY, PROMPT_CATEGORIES } from "@/lib/prompts-library";

export const metadata = {
  title: "Szablony - wybitnastrona.pl",
  description:
    "Gotowe szablony promptow do szybkiego startu projektu. Landing page, SaaS, e-commerce, blog, portfolio i więcej.",
};

export default function TemplatesPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-12 text-center">
            <span className="inline-block rounded-full border border-beige/20 bg-card/60 px-3 py-1 text-xs uppercase tracking-wider text-beige/80">
              Szablony
            </span>
            <h1 className="mt-4 text-balance text-4xl font-medium tracking-tight sm:text-5xl">
              Zacznij od gotowego pomysłu
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground">
              Klikamy w szablon, AI rozbudowuje resztę. Wszystkie promptu można potem edytować.
            </p>
          </div>

          <TemplatesGrid prompts={PROMPTS_LIBRARY} categories={PROMPT_CATEGORIES} />
        </section>
      </main>
      <Footer />
    </>
  );
}
