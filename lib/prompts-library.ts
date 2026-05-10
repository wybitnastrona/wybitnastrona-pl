/**
 * Biblioteka gotowych promptow startowych pogrupowanych w kategorie.
 * Pomaga uzytkownikowi rozpoczac od checkpointa zamiast od pustej kartki.
 */

export type PromptCategory =
  | "landing"
  | "saas"
  | "ecommerce"
  | "blog"
  | "portfolio"
  | "dashboard"
  | "tools"
  | "fun";

export type PromptDef = {
  id: string;
  category: PromptCategory;
  title: string;
  description: string;
  prompt: string;
  recommendedTemplate?: string;
};

export const PROMPT_CATEGORIES: { id: PromptCategory; label: string }[] = [
  { id: "landing", label: "Landing page" },
  { id: "saas", label: "SaaS" },
  { id: "ecommerce", label: "E-commerce" },
  { id: "blog", label: "Blog" },
  { id: "portfolio", label: "Portfolio" },
  { id: "dashboard", label: "Dashboard" },
  { id: "tools", label: "Narzędzia" },
  { id: "fun", label: "Dla zabawy" },
];

export const PROMPTS_LIBRARY: PromptDef[] = [
  // Landing
  {
    id: "landing-startup",
    category: "landing",
    title: "Landing dla startupu AI",
    description: "Hero, features, social proof, CTA",
    prompt:
      "Zbuduj nowoczesny landing page dla startupu AI. Hero z animacja gradientu, sekcja 3 features z ikonami, sekcja 'jak to dziala' (3 kroki), social proof z logotypami klientow, FAQ accordion, footer z newsletter. Ciemny motyw, fioletowo-niebieskie akcenty.",
  },
  {
    id: "landing-mobile-app",
    category: "landing",
    title: "Landing aplikacji mobilnej",
    description: "Mockup telefonu, App Store badges",
    prompt:
      "Stworz landing page dla aplikacji mobilnej. Lewa: tekst + przyciski 'Pobierz na iOS' i 'Pobierz na Android', prawa: mockup iPhone'a z screenshotem. Sekcje features z screenshots, testimonials z gwiazdkami, CTA na koncu. Jasny motyw.",
  },
  {
    id: "landing-coming-soon",
    category: "landing",
    title: "Coming soon page",
    description: "Countdown + email capture",
    prompt:
      "Zrob piekna stronke 'Coming soon' z countdown timer (do 31 grudnia 2026), email capture form i logiem firmy. Animowane czastki w tle, glassmorphism, neonowe akcenty.",
  },
  {
    id: "landing-event",
    category: "landing",
    title: "Strona wydarzenia / konferencji",
    description: "Agenda, speakers, ticketing",
    prompt:
      "Zbuduj strone konferencji technologicznej. Hero z data i miastem, agenda 3 dni, sekcja speakerow (siatka 8 osob z bio), sponsorzy, ceny biletow (3 tier), mapa lokalizacji.",
  },

  // SaaS
  {
    id: "saas-pricing",
    category: "saas",
    title: "Pricing page SaaS",
    description: "3 tiers + porównanie features",
    prompt:
      "Zbuduj strone Pricing dla SaaS. 3 plany (Free, Pro 29$/mc, Team 99$/mc) z karta highlight 'Polecany'. Tabela porownania features. Toggle Monthly/Yearly z 20% rabatu. FAQ na dole.",
  },
  {
    id: "saas-dashboard",
    category: "saas",
    title: "Dashboard SaaS z metrykami",
    description: "Sidebar, kpis, wykresy",
    prompt:
      "Zaprojektuj dashboard SaaS z sidebar (Home, Projects, Analytics, Settings), naglowkiem z searchem i avatar. Glowne pole: 4 KPI cards (Users, Revenue, Conversions, Churn), wykres liniowy 30 dni, tabela ostatnich aktywnosci. Ciemny motyw.",
  },
  {
    id: "saas-onboarding",
    category: "saas",
    title: "Onboarding wizard SaaS",
    description: "Multi-step form z progressem",
    prompt:
      "Zrob onboarding wizard 4 kroki: 1) wybor planu, 2) dane firmy, 3) zapraszanie zespolu, 4) potwierdzenie. Pasek postepu na gorze, animacje przejsc miedzy krokami, walidacja formularzy.",
  },

  // E-commerce
  {
    id: "ecommerce-shop",
    category: "ecommerce",
    title: "Sklep z odzieza",
    description: "Lista produktow, filtry, koszyk",
    prompt:
      "Zbuduj sklep online z odzieza. Naglowek z menu kategorii i ikona koszyka, sidebar z filtrami (rozmiar, kolor, cena slider), siatka 12 produktow z hover na zdjeciu, footer z newsletterem.",
  },
  {
    id: "ecommerce-product",
    category: "ecommerce",
    title: "Karta produktu",
    description: "Galeria, opcje, opinie",
    prompt:
      "Zaprojektuj strone produktu e-commerce. Lewa: galeria 4 zdjec z thumbnails, prawa: nazwa, cena, gwiazdki, opcje (rozmiar, kolor), przycisk 'Dodaj do koszyka', opis tabbed (Opis/Skladniki/Recenzje), polecane produkty na dole.",
  },

  // Blog
  {
    id: "blog-magazine",
    category: "blog",
    title: "Blog typu magazyn",
    description: "Featured + grid",
    prompt:
      "Zbuduj blog w stylu magazynu. Featured artykul na gorze (full-width), pod nim 3 najnowsze w siatce 3-kol, dalej kategorie z 4 art kazda, sidebar z popularne artykuly, newsletter, tagi.",
  },
  {
    id: "blog-post",
    category: "blog",
    title: "Post blogowy z TOC",
    description: "Spis tresci, share buttons, autor",
    prompt:
      "Zaprojektuj wpis blogowy. Hero z tytulem i okladka, autor z avatar i data, table of contents (sticky sidebar), tresc artykulu (markdown rendering, code blocks), social share buttons po lewej (sticky), polecane posty na dole.",
  },

  // Portfolio
  {
    id: "portfolio-designer",
    category: "portfolio",
    title: "Portfolio designera",
    description: "Hero + grid projektów",
    prompt:
      "Zrob portfolio dla product designera. Hero 'Cześć, jestem [Imie]' z duzym selfie, sekcja projektow w siatce z hover (4 prace), sekcja About z animowanym timeline doswiadczenia, kontakt z formularzem i linkami social.",
  },
  {
    id: "portfolio-dev",
    category: "portfolio",
    title: "Portfolio programisty",
    description: "Tech stack, projekty, blog",
    prompt:
      "Zaprojektuj portfolio dla full-stack developera. Terminal-style hero z animacja typingu, sekcja Tech Stack (ikony technologii), Projekty (3 case studies z github linkami), Blog feed (3 ostatnie posty), Kontakt.",
  },

  // Dashboard
  {
    id: "dashboard-finance",
    category: "dashboard",
    title: "Aplikacja finansowa",
    description: "Konta, wykresy, transakcje",
    prompt:
      "Zbuduj aplikacje finansowa. Card z saldem glownym i przyciskami (Wyslij, Odbierz, Top up). Wykres area chart wydatki vs przychody 30 dni. Lista 4 kont (current, savings, credit) z saldami. Tabela ostatnich 10 transakcji z kategoriami (kolor + ikona).",
  },
  {
    id: "dashboard-analytics",
    category: "dashboard",
    title: "Dashboard analityczny",
    description: "Metryki strony, wykresy, źródła",
    prompt:
      "Zrob dashboard Google Analytics-style. Top: 4 cards (Users, Sessions, Bounce Rate, Avg duration). Wykres liniowy unikalnych userow w czasie. Mapa swiata z heatmap odwiedzin. Tabela top stron i top zrodel ruchu.",
  },

  // Narzędzia
  {
    id: "tools-todo",
    category: "tools",
    title: "Aplikacja TODO",
    description: "Lista zadań z drag&drop",
    prompt:
      "Zbuduj aplikacje TODO list. Input do dodawania, listy zadan z checkbox, edycja inline, priority colors (high/med/low), filtry (All/Active/Completed), licznik. LocalStorage do trwalosci.",
  },
  {
    id: "tools-pomodoro",
    category: "tools",
    title: "Pomodoro timer",
    description: "25/5 minutowe sesje pracy",
    prompt:
      "Zrob aplikacje Pomodoro. Duzy circular timer 25 min, przyciski Start/Pause/Reset, licznik sesji, opcje (czas pracy, przerwa, dlugosc dlugiej przerwy). Dzwiek po sesji. Statystyki dzienne.",
  },
  {
    id: "tools-color-picker",
    category: "tools",
    title: "Generator palet kolorów",
    description: "Random + adjustowanie",
    prompt:
      "Aplikacja generujaca palety kolorow. 5 kolorow w rzedzie z hex code i kopiowaniem na klik. Spacja - generuje nowa palete. Mozliwosc lock konkretnych kolorow. Historia ostatnich 10 palet.",
  },

  // Fun
  {
    id: "fun-snake",
    category: "fun",
    title: "Gra Snake",
    description: "Klasyczna gra w przeglądarce",
    prompt:
      "Stworz gre Snake na canvas. Plansza 20x20, waz rosnie po zjedzeniu jablka, game over po uderzeniu w sciane lub siebie. Wyswietl best score (localStorage), kontrola strzalkami, przycisk restart.",
  },
  {
    id: "fun-tic-tac-toe",
    category: "fun",
    title: "Kółko i krzyżyk",
    description: "Multiplayer + AI bot",
    prompt:
      "Gra kolko i krzyzyk. Tryb 2 graczy lokalnie + tryb przeciw AI (3 poziomy trudnosci: latwy, sredni, niezwyciezony minimax). Animacje wygranej linii, statystyki wygranych, przycisk reset.",
  },

  // Dodatkowe
  {
    id: "tools-qr",
    category: "tools",
    title: "Generator QR kodów",
    description: "Tekst lub URL → QR",
    prompt:
      "Generator kodow QR. Input na tekst/URL, generowanie QR w czasie rzeczywistym, opcje koloru i wielkosci, przycisk pobierz PNG.",
  },
  {
    id: "saas-auth",
    category: "saas",
    title: "Strona logowania SaaS",
    description: "Login + signup + Google OAuth",
    prompt:
      "Zaprojektuj strone logowania SaaS. Lewa: formularz email/haslo + 'Zaloguj przez Google' + link do rejestracji. Prawa: cytat klienta z avatar lub gradient z brandingiem. Walidacja inline, obsluga bledow.",
  },
];

export function getPromptsByCategory(category: PromptCategory): PromptDef[] {
  return PROMPTS_LIBRARY.filter((p) => p.category === category);
}

export function getPromptById(id: string): PromptDef | undefined {
  return PROMPTS_LIBRARY.find((p) => p.id === id);
}
