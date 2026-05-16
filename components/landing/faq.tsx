"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const QUESTIONS = [
  {
    q: "Czym wybitnastrona.pl rozni sie od ChatGPT?",
    a: "ChatGPT zwraca tekst. My uruchamiamy wygenerowany kod w bezpiecznym sandboxie (Sandpack), wiec od razu widzisz dzialajaca strone, możesz ja edytowac, opublikowac na subdomenie i wyeksportowac jako ZIP.",
  },
  {
    q: "Jakiego frameworka uzywa AI?",
    a: "Generujemy aplikacje React 19 + TypeScript z Tailwind CSS. Dla bardziej zlozonych projektów w pelnym Next.js możesz wyeksportowac kod do ZIP i kontynuowac lokalnie.",
  },
  {
    q: "Czy strona dziala bez logowania?",
    a: "Możesz przegladac i klikac sugestie bez konta, ale do zapisania projektu i opublikowania potrzebne jest zalozenie konta (email lub Google).",
  },
  {
    q: "Czy moge eksportowac kod?",
    a: "Tak. Kazdy projekt ma przycisk Export ktory pakuje wszystkie pliki w archiwum ZIP gotowe do otwarcia w VS Code i wgrania na hosting.",
  },
  {
    q: "Gdzie hostowane sa opublikowane strony?",
    a: "Subdomeny <slug>.wybitnastrona.pl serwuja podglad Sandpack zapisany w naszej bazie. Po wyeksportowaniu możesz wdrozyc na Vercel, Netlify lub dowolnym hostingu statycznym.",
  },
  {
    q: "Ile to kosztuje?",
    a: "Plan startowy jest darmowy do okreslonego limitu generowan miesiecznie. Plany Pro i Teams beda dostepne wkrotce - obecnie pricing dziala w trybie placeholdera.",
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      className="border-t border-beige/10 bg-background py-16 sm:py-24"
    >
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <span className="inline-block rounded-full border border-beige/20 bg-card/60 px-3 py-1 text-xs uppercase tracking-wider text-beige/80">
            FAQ
          </span>
          <h2 className="mt-4 text-balance text-3xl font-medium tracking-tight sm:text-4xl">
            Najczestsze pytania
          </h2>
        </div>

        <Accordion className="space-y-2">
          {QUESTIONS.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="rounded-xl border border-beige/10 bg-card px-4"
            >
              <AccordionTrigger className="text-left text-base font-medium text-foreground hover:text-beige hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
