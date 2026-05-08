import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Polityka prywatnosci - wybitnastrona.pl",
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <article className="prose mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Polityka prywatnosci
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ostatnia aktualizacja: {new Date().toLocaleDateString("pl-PL")}
          </p>

          <div className="mt-8 space-y-6 text-sm leading-7 text-foreground/90">
            <Section title="1. Administrator danych">
              Administratorem danych osobowych jest wybitnastrona.pl. Kontakt:{" "}
              <a className="text-beige" href="mailto:hello@wybitnastrona.pl">
                hello@wybitnastrona.pl
              </a>
              .
            </Section>

            <Section title="2. Jakie dane przetwarzamy">
              <ul className="list-disc pl-5 space-y-1">
                <li>Adres email i identyfikator OAuth (Google) - do logowania.</li>
                <li>Tresc promptow i wygenerowane pliki - do dzialania uslugi.</li>
                <li>Dane techniczne (logi, IP) - do bezpieczenstwa i diagnostyki.</li>
              </ul>
            </Section>

            <Section title="3. Cele i podstawa prawna">
              Dane przetwarzamy na podstawie umowy (RODO art. 6 ust. 1 lit. b) -
              swiadczenie uslugi - oraz uzasadnionego interesu (lit. f) -
              bezpieczenstwo i ulepszanie produktu.
            </Section>

            <Section title="4. Procesory">
              Korzystamy z: Supabase (baza danych i auth), Anthropic (model AI),
              Vercel (hosting), CodeSandbox/Sandpack (sandbox podgladu).
            </Section>

            <Section title="5. Twoje prawa">
              Masz prawo do dostepu, sprostowania, usuniecia, ograniczenia
              przetwarzania, przenoszenia, sprzeciwu oraz skargi do PUODO.
            </Section>

            <Section title="6. Cookies">
              Uzywamy ciasteczek niezbednych do dzialania uslugi (sesja Supabase)
              oraz - po zgodzie - opcjonalnych do statystyk i ulepszania UX.
              Ustawienia mozna zmienic w bannerze cookies.
            </Section>

            <Section title="7. Czas przechowywania">
              Dane przechowujemy do czasu usuniecia konta lub przez okres wymagany
              przepisami (faktury, ksiegowosc).
            </Section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
