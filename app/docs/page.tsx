import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Dokumentacja — wybitnastrona.pl",
  description: "Jak korzystać z wybitnastrona.pl. Przewodnik po wszystkich funkcjach platformy.",
};

const SECTIONS = [
  {
    id: "quick-start",
    title: "Szybki start",
    content: [
      {
        heading: "1. Opisz swoją stronę",
        body: "W polu tekstowym na stronie głównej opisz, co chcesz zbudować. Im więcej szczegółów (branża, kolorystyka, sekcje, treść), tym lepszy efekt. Możesz też kliknąć przycisk ✦ aby wylosować gotowy prompt.",
      },
      {
        heading: "2. Wybierz platformę",
        body: "Przycisk 'Strona internetowa' pozwala wybrać typ projektu: Web (React/Vite), iOS (Swift/SwiftUI), Android (Kotlin/Compose). Dla stron internetowych nie potrzebujesz nic instalować — podgląd działa w przeglądarce.",
      },
      {
        heading: "3. Kliknij 'Zbuduj'",
        body: "AI (Claude Haiku, Sonnet lub Opus) zaczyna generować kod. W panelu czatu po lewej zobaczysz tok rozumowania agenta, potem pliki pojawiają się na żywo w podglądzie po prawej.",
      },
      {
        heading: "4. Iteruj przez czat",
        body: "Wpisz co chcesz zmienić: 'Zmień kolor nagłówka na czerwony', 'Dodaj sekcję z cenami', 'Napraw formularz'. AI edytuje tylko potrzebne pliki (patchFile), bez przebudowy całości.",
      },
      {
        heading: "5. Opublikuj",
        body: "Kliknij 'Opublikuj' — strona dostaje publiczny URL w formacie {slug}.wybitny.website. Możesz też podpiąć własną domenę w ustawieniach projektu.",
      },
    ],
  },
  {
    id: "modes",
    title: "Tryby generowania",
    content: [
      {
        heading: "Agent (domyślny)",
        body: "AI natychmiast pisze kod. Idealny gdy wiesz czego chcesz. Generacja zajmuje 30–120 sekund.",
      },
      {
        heading: "Plan",
        body: "AI najpierw przedstawia listę kroków do zatwierdzenia. Użyj gdy chcesz kontrolować co AI zamierza zrobić przed uruchomieniem budowania. Tańsze przy dużych projektach.",
      },
      {
        heading: "Chat",
        body: "Rozmowa o kodzie bez pisania plików. Pytaj o architekturę, proś o wyjaśnienia, sprawdzaj możliwości. Najtańszy tryb.",
      },
    ],
  },
  {
    id: "credits",
    title: "Kredyty i płatności",
    content: [
      {
        heading: "Czym są kredyty?",
        body: "Kredyty to waluta platformy. 1 kredyt = 0.02 zł (50 kredytów = 1 PLN). Nowy użytkownik otrzymuje 100 kredytów na start — wystarczy na ~1–2 generacje Auto.",
      },
      {
        heading: "Koszt poszczególnych modeli",
        body: "Auto (Haiku): ~60 kredytów (1.20 zł) · Sonnet 4.6: ~240 kredytów (4.80 zł) · Opus 4.6: ~600 kredytów (12 zł) · Opus 4.7: ~1200 kredytów (24 zł). Krótsze rozmowy kosztują mniej.",
      },
      {
        heading: "Zakup kredytów",
        body: "Pakiety od 9.90 zł (500 kr) do 179 zł (12 000 kr). Płatność przez Stripe: BLIK, karta, Apple Pay. Kredyty nie wygasają.",
      },
      {
        heading: "Plan PRO i WYBITNY",
        body: "Plan PRO (80 zł/mc) odblokuje modele Sonnet/Opus i platformy iOS/Android + 500 kredytów/mc. Plan WYBITNY (799 zł/mc) odblokuje watchOS/tvOS/visionOS, ARKit, HealthKit, Metal + 5000 kr/mc.",
      },
    ],
  },
  {
    id: "projects",
    title: "Zarządzanie projektami",
    content: [
      {
        heading: "Publiczne vs prywatne",
        body: "Projekty publiczne są widoczne w Showcase i dostępne pod adresem URL. Prywatne dostępne tylko dla Ciebie (wymaga planu PRO). W planie FREE wszystkie projekty są publiczne.",
      },
      {
        heading: "Historia zmian",
        body: "Każda zakończona generacja AI tworzy automatyczny snapshot. W zakładce Historia możesz cofnąć się do dowolnego poprzedniego stanu.",
      },
      {
        heading: "Floating preview",
        body: "Przycisk 'Float' w toolbarze workspace otwiera pływające okno podglądu, które można przesuwać i skalować niezależnie od edytora kodu.",
      },
      {
        heading: "Eksport ZIP",
        body: "Każdy projekt możesz pobrać jako ZIP. Dla projektów iOS i Android ZIP zawiera pełny kod Xcode/Gradle gotowy do otwarcia w IDE.",
      },
    ],
  },
  {
    id: "integrations",
    title: "Integracje",
    content: [
      {
        heading: "Supabase (własna baza danych)",
        body: "W zakładce 'Baza' każdego projektu możesz podpiąć swoje klucze Supabase (URL i anon key). AI będzie generować kod korzystający z Twojej bazy, a nie platformowej.",
      },
      {
        heading: "Stripe (własne płatności)",
        body: "W zakładce 'Stripe' każdego projektu wpisz swój klucz publiczny Stripe (pk_live_... lub pk_test_...). AI wygeneruje kod checkout z Twoim kontem.",
      },
      {
        heading: "Konektory MCP",
        body: "W Ustawieniach → Konektory możesz podpiąć Notion, Linear lub własny serwer MCP. AI zyska dostęp do Twoich danych zewnętrznych.",
      },
      {
        heading: "Formularz kontaktowy → email",
        body: "AI automatycznie generuje formularze które wysyłają dane na Twój email przez nasz backend (Resend API). Konfiguracja przez RESEND_API_KEY w ustawieniach środowiska.",
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:flex-row sm:px-6 sm:py-20">
          {/* Sidebar */}
          <nav className="hidden w-48 shrink-0 sm:block">
            <p className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground">
              Sekcje
            </p>
            <ul className="space-y-1">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="block rounded-md px-2 py-1.5 text-sm text-foreground/70 transition hover:bg-white/5 hover:text-beige"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex-1 space-y-12">
            <header>
              <span className="inline-block rounded-full border border-beige/20 bg-card/60 px-3 py-1 text-xs uppercase tracking-wider text-beige/80">
                Dokumentacja
              </span>
              <h1 className="mt-4 text-balance text-3xl font-medium tracking-tight sm:text-4xl">
                Jak korzystać z wybitnastrona.pl
              </h1>
              <p className="mt-3 text-muted-foreground">
                Kompletny przewodnik po wszystkich funkcjach platformy. Masz pytania?{" "}
                <a
                  href="mailto:kontakt@wybitnastrona.pl"
                  className="text-beige/80 hover:text-beige"
                >
                  kontakt@wybitnastrona.pl
                </a>
              </p>
            </header>

            {SECTIONS.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-20">
                <h2 className="mb-5 text-xl font-medium text-foreground">
                  {section.title}
                </h2>
                <div className="space-y-5">
                  {section.content.map((item) => (
                    <div
                      key={item.heading}
                      className="rounded-xl border border-beige/10 bg-card/40 p-4"
                    >
                      <h3 className="mb-1.5 text-sm font-medium text-foreground">
                        {item.heading}
                      </h3>
                      <p className="text-sm text-muted-foreground">{item.body}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
