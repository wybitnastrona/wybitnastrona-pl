import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Regulamin - wybitnastrona.pl",
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <article className="prose mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Regulamin usługi
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ostatnia aktualizacja: {new Date().toLocaleDateString("pl-PL")}
          </p>

          <div className="mt-8 space-y-6 text-sm leading-7 text-foreground/90">
            <Section title="1. Postanowienia wstepne">
              Niniejszy regulamin okresla zasady korzystania z platformy
              wybitnastrona.pl - generatora stron internetowych opartego o AI.
              Korzystanie z usługi oznacza akceptacje regulaminu.
            </Section>

            <Section title="2. Konto użytkownika">
              Dostep do funkcji generowania wymaga utworzenia konta. Użytkownik
              odpowiada za poufnosc swoich danych logowania i wszystkie dzialania
              wykonane z jego konta.
            </Section>

            <Section title="3. Tresci generowane">
              Wygenerowany kod nalezy do użytkownika. Użytkownik zobowiazuje sie
              nie generowac tresci sprzecznych z prawem, naruszajacych prawa osób
              trzecich, ani sluzacych do oszustw, phishingu, malware lub
              dystrybucji tresci niedozwolonych.
            </Section>

            <Section title="4. Limity i fair use">
              Plan darmowy ma limit generowan opisany w cenniku. Naduzycia
              (automatyzacja, scraping) moga skutkowac zawieszeniem konta.
            </Section>

            <Section title="5. Prawa wlasnosci intelektualnej">
              Logo, marka i kod platformy naleza do wybitnastrona.pl. Tresci
              użytkownika - prompty, pliki - pozostaja jego wlasnoscia.
            </Section>

            <Section title="6. Wylaczenie odpowiedzialnosci">
              Uslugi swiadczone sa as-is. Nie gwarantujemy poprawnosci,
              kompletnosci ani przydatnosci wygenerowanego kodu do okreslonego
              celu. Użytkownik korzysta na własna odpowiedzialnosc.
            </Section>

            <Section title="7. Reklamacje i kontakt">
              Reklamacje prosimy zglaszac na{" "}
              <a className="text-beige" href="mailto:hello@wybitnastrona.pl">
                hello@wybitnastrona.pl
              </a>
              . Odpowiadamy w ciagu 14 dni roboczych.
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
