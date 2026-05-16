import { Code2, MessageSquare, Rocket } from "lucide-react";

const STEPS = [
  {
    icon: MessageSquare,
    title: "Opisz pomysl",
    description:
      "Wpisz w jednym zdaniu, co chcesz zbudowac. AI rozumie tez zlozone wymagania.",
  },
  {
    icon: Code2,
    title: "AI pisze kod",
    description:
      "Claude generuje pliki React + TypeScript w czasie rzeczywistym. Widzisz kazda zmiane na zywo.",
  },
  {
    icon: Rocket,
    title: "Publikuj jednym klikiem",
    description:
      "Strona pojawia sie pod Twoja subdomena. Mozesz tez wyeksportowac kod jako ZIP.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-t border-beige/10 bg-background py-16 sm:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <span className="inline-block rounded-full border border-beige/20 bg-card/60 px-3 py-1 text-xs uppercase tracking-wider text-beige/80">
            Jak to dziala
          </span>
          <h2 className="mt-4 text-balance text-3xl font-medium tracking-tight sm:text-4xl">
            Trzy kroki do gotowej strony
          </h2>
          <p className="mt-3 text-muted-foreground">
            Bez znajomosci kodu, bez kombinowania z hostingiem. Wszystko w
            jednym miejscu — opisujesz, my budujemy i publikujemy.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, description }, i) => (
            <div
              key={title}
              className="relative flex flex-col gap-3 rounded-xl border border-beige/10 bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-beige/20 bg-background text-beige">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  0{i + 1}
                </span>
              </div>
              <h3 className="text-lg font-medium">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
