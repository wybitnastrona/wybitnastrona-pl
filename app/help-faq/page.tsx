import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Pomoc i FAQ — wybitnastrona.pl",
  description: "Najczęściej zadawane pytania i centrum pomocy wybitnastrona.pl.",
};

const FAQ_ITEMS = [
  {
    q: "Jak zacząć? Muszę znać programowanie?",
    a: "Nie, absolutnie nie. Wystarczy opisać po polsku co chcesz zbudować. AI automatycznie generuje cały kod. Możesz budować strony, sklepy i aplikacje bez znajomości HTML, CSS czy JavaScript.",
  },
  {
    q: "Dlaczego moja strona ma 'Page not found' przy klikaniu w menu?",
    a: "Sandpack (nasz silnik podglądu w przeglądarce) nie obsługuje tradycyjnego routingu URL. AI powinien używać routingu opartego na stanie React. Jeśli widzisz ten błąd, dodaj w czacie: 'Napraw nawigację — użyj useState zamiast react-router.' AI poprawi kod.",
  },
  {
    q: "Ile czasu trwa generowanie strony?",
    a: "Typowa strona landing page generuje się w 30–90 sekund. Bardziej złożone projekty (sklepy, dashboardy) mogą zająć 2–5 minut. Jeśli generacja zajmuje ponad 5 minut, AI automatycznie wstrzymuje pracę i możesz kliknąć 'Kontynuuj generowanie'.",
  },
  {
    q: "Czy mogę podpiąć własną domenę?",
    a: "Tak! W każdym projekcie w menu 'Udostępnij' możesz wpisać własną domenę. Dodaj CNAME record wskazujący na cname.wybitny.website i poczekaj do 30 minut na propagację.",
  },
  {
    q: "Jak działają kredyty? Czy wygasają?",
    a: "Kredyty nie wygasają. 1 kredyt = 0.02 zł. Nowy użytkownik dostaje 100 kredytów na start. Koszt generacji zależy od modelu AI: Auto (Haiku) ~60 kr, Sonnet 240 kr, Opus 1200 kr.",
  },
  {
    q: "Czy mogę eksportować wygenerowany kod?",
    a: "Tak. Przycisk 'Eksport ZIP' pobiera wszystkie pliki projektu. Dla projektów iOS/Android otrzymasz pełny projekt Xcode/Android Studio gotowy do uruchomienia.",
  },
  {
    q: "Jak dodać formularz kontaktowy który wysyła emaile?",
    a: "AI automatycznie dodaje formularz kontaktowy z integracją emailową gdy opiszesz to w prompcie: np. 'Dodaj formularz kontaktowy który wysyła email na moje@email.pl'. Email trafi na Twój adres przez nasz serwer (Resend). Dane zapisywane są też w bazie Supabase.",
  },
  {
    q: "Jaka jest różnica między planem FREE a PRO?",
    a: "FREE: Web only (React/Vite), model Auto (Haiku), projekty publiczne, 100 kredytów na start. PRO (80 zł/mc): Web + iOS (Swift) + Android (Kotlin), modele Sonnet/Opus 4.6, projekty prywatne, 500 kredytów/mc. WYBITNY: wszystko + watchOS/tvOS/visionOS + model Opus 4.7 z ARKit/HealthKit.",
  },
  {
    q: "Jak podpiąć własne Supabase lub Stripe?",
    a: "W projekcie (workspace) otwórz zakładkę 'Baza' lub 'Stripe' w toolbarze i wpisz swoje klucze. AI przy kolejnej generacji będzie automatycznie używał Twoich kluczy w generowanym kodzie.",
  },
  {
    q: "Czy moje projekty są widoczne publicznie?",
    a: "W planie FREE wszystkie projekty są publiczne (mogą pojawić się w Showcase). W planie PRO możesz ustawić projekt jako prywatny — nikt poza Tobą nie będzie mógł go zobaczyć.",
  },
  {
    q: "Podgląd nie ładuje się lub pokazuje błąd 'TIME_OUT'",
    a: "Podgląd działa przez bundler CodeSandbox. Jeśli używasz Opery lub VPN, bundler może być zablokowany. Spróbuj Chrome lub Firefox. Możesz też otworzyć projekt w nowej karcie. Zawartość strony można też pobrać jako ZIP.",
  },
  {
    q: "Czy AI może czytać pliki które wgrywam?",
    a: "Tak! W czacie projektu przycisk 'Załącz' pozwala wgrać pliki (zdjęcia, PDF, CSV, kod) do 5 MB. AI przeanalizuje zawartość i uwzględni ją przy generowaniu. Przydatne np. do 'Odtwórz layout z tego screenshota' lub 'Zintegruj dane z tego CSV'.",
  },
  {
    q: "Jak zresetować projekt i zacząć od nowa?",
    a: "W menu projektu (⋯) wybierz 'Historia'. Tam możesz wrócić do dowolnego poprzedniego stanu projektu (snapshot jest tworzony po każdej generacji). Możesz też stworzyć nowy projekt i opisać czego nie chcesz powtarzać.",
  },
  {
    q: "Czy mogę współpracować z innymi nad projektem?",
    a: "Funkcja współpracy (real-time collab) jest w planie. Na razie możesz udostępnić projekt publicznie i partner może go 'zremixować' ze Showcase. Pełna współpraca z prawami edycji pojawi się w kolejnej wersji.",
  },
  {
    q: "Co zrobić gdy AI zrobi coś nie tak jak chciałem?",
    a: "Użyj przycisku 'Cofnij do tego momentu' obok wiadomości AI w czacie — to przywraca stan projektu sprzed tej konkretnej generacji. Możesz też wpisać w czacie dokładnie co ma naprawić.",
  },
];

export default function HelpFaqPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-12 text-center">
            <span className="inline-block rounded-full border border-beige/20 bg-card/60 px-3 py-1 text-xs uppercase tracking-wider text-beige/80">
              Pomoc i FAQ
            </span>
            <h1 className="mt-4 text-balance text-3xl font-medium tracking-tight sm:text-4xl">
              Najczęściej zadawane pytania
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground">
              Nie znalazłeś odpowiedzi? Napisz do nas:{" "}
              <a
                href="mailto:kontakt@wybitnastrona.pl"
                className="font-medium text-beige/90 hover:text-beige"
              >
                kontakt@wybitnastrona.pl
              </a>
            </p>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => (
              <details
                key={idx}
                className="group rounded-xl border border-beige/10 bg-card/40 px-5 py-4 transition hover:border-beige/20"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-foreground list-none">
                  {item.q}
                  <svg
                    className="h-4 w-4 shrink-0 rotate-0 text-muted-foreground transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>

          {/* Kontakt CTA */}
          <div className="mt-12 rounded-2xl border border-beige/15 bg-card/40 p-6 text-center">
            <h2 className="text-lg font-medium text-foreground">Masz inne pytanie?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Napisz do nas, odpowiadamy w ciągu 24 godzin.
            </p>
            <a
              href="mailto:kontakt@wybitnastrona.pl"
              className="mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-beige px-5 text-sm font-medium text-beige-foreground transition hover:bg-beige/90"
            >
              kontakt@wybitnastrona.pl
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
