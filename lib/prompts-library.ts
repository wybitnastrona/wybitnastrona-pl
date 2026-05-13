/**
 * Biblioteka gotowych promptow startowych pogrupowanych w kategorie.
 * Pomaga uzytkownikowi rozpoczac od checkpointa zamiast od pustej kartki.
 */

export type PromptCategory =
  | "landing"
  | "local_business"
  | "kids"
  | "hotel"
  | "health"
  | "beauty"
  | "food"
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
  /** Jezeli true — zalecany do prezentacji w kreatorze "szybki start" */
  featured?: boolean;
};

export const PROMPT_CATEGORIES: { id: PromptCategory; label: string; emoji: string }[] = [
  { id: "landing", label: "Landing page", emoji: "🚀" },
  { id: "local_business", label: "Usługi lokalne", emoji: "🔧" },
  { id: "kids", label: "Żłobek / Przedszkole", emoji: "🧸" },
  { id: "hotel", label: "Hotel / Agroturystyka", emoji: "🏨" },
  { id: "health", label: "Gabinet / Klinika", emoji: "🩺" },
  { id: "beauty", label: "Salon kosmetyczny", emoji: "💅" },
  { id: "food", label: "Restauracja / Catering", emoji: "🍽️" },
  { id: "saas", label: "SaaS / Aplikacja", emoji: "⚙️" },
  { id: "ecommerce", label: "Sklep internetowy", emoji: "🛒" },
  { id: "blog", label: "Blog / Treść", emoji: "📝" },
  { id: "portfolio", label: "Portfolio", emoji: "🎨" },
  { id: "dashboard", label: "Dashboard", emoji: "📊" },
  { id: "tools", label: "Narzędzia", emoji: "🛠️" },
  { id: "fun", label: "Dla zabawy", emoji: "🎮" },
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

// ─── Branżowe szablony ────────────────────────────────────────────────────────

const INDUSTRY_PROMPTS: PromptDef[] = [
  // ────── Żłobek / Przedszkole ──────
  {
    id: "kids-nursery",
    category: "kids",
    featured: true,
    title: "Żłobek / Klub malucha",
    description: "Ciepła strona żłobka z formularzem zapisu",
    prompt: `Stwórz ciepłą, profesjonalną stronę internetową dla żłobka/klubu malucha. Styl: pastelowe kolory (miętowy, żółty, brzoskwiniowy), okrągłe formy, przyjazna typografia.

Sekcje (w tej kolejności):
1. HERO: nazwa żłobka, hasło "Bezpieczne miejsce dla Twojego Malucha", zdjęcie (wygeneruj ciepłe zdjęcie sali zabaw dla niemowląt i małych dzieci, bright colors, safe environment), dwa przyciski: "Sprawdź wolne miejsca" i "Zadzwoń teraz".
2. DLACZEGO MY: 4 karty z ikonami (Wykwalifikowana kadra, Kameralne grupy max 8 dzieci, Catering ekologiczny, Monitoring 24/7).
3. HARMONOGRAM DNIA: timeline z godzinami (7:00 powitanie, 9:00 zajęcia, 12:00 obiad, 15:00 drzemka, 17:30 odbiór). Pastelowe tło.
4. CENNIK: 3 karty — Pół dnia (750 zł/mc), Cały dzień (1250 zł/mc), Jednorazowo (85 zł/dzień). Każda karta z listą co zawiera.
5. GALERIA: grid 6 zdjęć (wygeneruj 6 różnych zdjęć: bawiące się dzieci, sala zabaw, jedzenie, zajęcia plastyczne).
6. OPINIE RODZICÓW: 3 opinie z imionami i gwiazdkami (5/5).
7. FORMULARZ ZAPISU: pola: Imię i nazwisko rodzica, Email, Telefon, Imię dziecka, Wiek dziecka, Preferowany termin. Przycisk "Wyślij zgłoszenie". Obsłuż submit przez /api/form-submit.
8. DANE KONTAKTOWE + MAPA PLACEHOLDER: adres, telefon, email, godziny otwarcia (pon-pt 7:00-17:30).
9. FOOTER z linkami.

Wszystkie linki wewnętrzne przez href="#sekcja" (anchor). NIE używaj react-router.`,
  },
  {
    id: "kids-kindergarten",
    category: "kids",
    title: "Przedszkole prywatne",
    description: "Strona prywatnego przedszkola z programem edukacyjnym",
    prompt: `Strona prywatnego przedszkola. Kolorowa, energetyczna, zaufanie rodziców.

Sekcje:
1. HERO z nazwą i hasłem "Wychowujemy Ciekawych Świata", hero photo (wygeneruj: cheerful kindergarten classroom with colorful walls, happy children aged 3-6, bright educational environment).
2. PROGRAM EDUKACYJNY: 4 filary — Kreatywność, Dwujęzyczność, Ruch i Sport, Emocje i Relacje. Każdy z ikonką i opisem 2 zdania.
3. WIEK DZIECI: zakładki 2,5-3 lata / 3-4 lata / 5-6 lata z opisem programu.
4. KADRA: 3 karty nauczycieli z imionami (Pani Ania — pedagog specjalny, Pan Marek — logopeda, Pani Karolina — angielski native).
5. CENNIK: tygodniowy harmonogram z cenami.
6. FORMULARZ ZAPISU na rok szkolny.
7. FAQ accordion (10 najczęstszych pytań rodziców).
8. FOOTER.`,
  },

  // ────── Hotel / Agroturystyka ──────
  {
    id: "hotel-luxury",
    category: "hotel",
    featured: true,
    title: "Hotel / Pensjonat",
    description: "Elegancka strona hotelu z systemem rezerwacji",
    prompt: `Stwórz elegancką stronę hotelu/pensjonatu. Klimat: luksusowy, spokojny, ciepłe brązy i biele, zdjęcia natury.

Sekcje:
1. HERO FULLSCREEN: nazwa hotelu, hasło "Twoje schronienie od zgiełku", wygeneruj zdjęcie (luxury boutique hotel exterior at golden hour, surrounded by nature, warm lighting). Przycisk "Zarezerwuj pokój".
2. O HOTELU: 2-kolumnowy układ — lewa tekst o historii i wartościach, prawa zdjęcie (cozy hotel lounge with fireplace, warm atmosphere).
3. POKOJE: grid 3 kart — Pokój Standard, Pokój Superior, Suite. Każda z ceną za noc, listą udogodnień i przyciskiem "Rezerwuj". Zdjęcia pokojów przez generateImage.
4. UDOGODNIENIA: ikony + teksy — Spa & Wellness, Restauracja, Basen, Parking, Wi-Fi, Śniadania.
5. RESTAURACJA: sekcja z menu (śniadanie/obiad/kolacja), zdjęcie (hotel restaurant with elegant table setting, candlelight dinner).
6. GALERIA: masonry grid 8 zdjęć (różne ujęcia hotelu i okolicy).
7. OPINIE: 4 opinie z TripAdvisor-style kartami i gwiazdkami.
8. LOKALIZACJA: tekst o dojezdzie + godziny check-in/out.
9. FORMULARZ REZERWACJI: Imię, Email, Telefon, Data przyjazdu, Data wyjazdu, Liczba osób, Typ pokoju (select), Specjalne życzenia. Submit przez /api/form-submit.
10. FOOTER z linkami mediów społecznościowych.

Styl: ciemne tło sekcji naprzemiennie z jasnym, serif font dla nagłówków.`,
  },
  {
    id: "hotel-agro",
    category: "hotel",
    title: "Agroturystyka",
    description: "Strona gospodarstwa agroturystycznego",
    prompt: `Strona agroturystyki/domku letniskowego. Klimat: wiejski, naturalny, drewno i zieleń.

Sekcje:
1. HERO z hasłem "Prawdziwy wypoczynek pośród natury" i zdjęciem (wygeneruj: cozy wooden cottage in Polish countryside, green meadows, summer sunset).
2. OFERTA NOCLEGOWA: 3 opcje — Domek dla 4 osób, Pokój w domu, Pole namiotowe. Z cenami.
3. ATRAKCJE: lista aktywności (kąpielisko, grzybobranie, ognisko, jazda konna, rowery).
4. ZWIERZĘTA NA FARMIE: section z zdjęciami (cute farm animals: chickens, goats, horses on a farm).
5. OPINIE GOŚCI.
6. FORMULARZ REZERWACJI z datami i opcją wyboru noclegu.
7. DOJAZD: instrukcje dojazdu, telefon kontaktowy.`,
  },

  // ────── Gabinet / Klinika ──────
  {
    id: "health-clinic",
    category: "health",
    featured: true,
    title: "Gabinet lekarski / Klinika",
    description: "Profesjonalna strona gabinetu z rezerwacją wizyt",
    prompt: `Profesjonalna strona gabinetu lekarskiego lub kliniki. Styl: czysty, biało-niebieski, zaufanie i kompetencja.

Sekcje:
1. HERO: "Zdrowie w dobrych rękach" + zdjęcie (professional medical clinic interior, modern equipment, clean and bright). Przyciski: "Umów wizytę" i "Zadzwoń".
2. SPECJALIZACJE: 6 kart z ikonami — każda z nazwą specjalizacji i opisem (np. Kardiologia, Ortopedia, Dermatologia, USG, Dietetyka, Psychologia).
3. LEKARZE: 4 karty lekarzy z imionami, specjalizacją i doświadczeniem (wygeneruj zdjęcia: professional doctor portrait in white coat).
4. JAK DZIAŁAMY: 4 kroki — Zadzwoń/Napisz → Wybierz termin → Przygotuj dokumenty → Wizyta.
5. CENNIK USŁUG: tabela z nazwami usług i cenami (np. Konsultacja 150 zł, USG 200 zł, EKG 80 zł).
6. OPINIE PACJENTÓW: 4 opinie.
7. FORMULARZ REJESTRACJI: Imię i nazwisko, Email, Telefon, PESEL (opcjonalnie), Specjalizacja (select), Preferowany termin, Opis dolegliwości. RODO checkbox. Submit przez /api/form-submit.
8. KONTAKT: adres, telefon, email, godziny przyjęć.
9. FOOTER z RODO i regulaminem.

Kolory: biel + odcienie niebieskiego #2563eb, bez jaskrawości.`,
  },
  {
    id: "health-physio",
    category: "health",
    title: "Fizjoterapeuta / Rehabilitacja",
    description: "Strona gabinetu fizjoterapii",
    prompt: `Strona gabinetu fizjoterapii i rehabilitacji. Klimat: aktywny, zdrowy, zielono-biały.

Sekcje:
1. HERO z hasłem "Powróć do pełnej sprawności" i zdjęciem (physiotherapy session, therapist helping patient, professional setting).
2. ZABIEGI: 8 kart — masaż leczniczy, kinesiotaping, terapia manualna, suche igłowanie, ultradźwięki, laser, ćwiczenia korekcyjne, terapia blizn.
3. SPECJALIZACJE: bóle kręgosłupa, urazy sportowe, rehabilitacja po operacji, skolioza u dzieci.
4. CERTYFIKATY: sekcja z nazwami szkoleń i kursów.
5. EFEKTY: 3 case studies "Przed i po" tekstowo.
6. FORMULARZ PIERWSZEJ WIZYTY.
7. CENNIK i FAQ.`,
  },

  // ────── Salon kosmetyczny ──────
  {
    id: "beauty-salon",
    category: "beauty",
    featured: true,
    title: "Salon kosmetyczny / Beauty",
    description: "Elegancka strona salonu z cennikiem i rezerwacją",
    prompt: `Elegancka strona salonu kosmetycznego. Styl: różowo-złoty, luksusowy, feminin.

Sekcje:
1. HERO: "Odkryj swoje piękno" + zdjęcie (luxury beauty salon interior, rose gold and white decor, elegant ambiance). Przycisk "Zarezerwuj wizytę".
2. USŁUGI: 6 kategorii z rozwijalną listą — Manicure, Pedicure, Stylizacja rzęs, Brwi i laminacja, Mezoterapia, Peeling chemiczny. Każda z cenami.
3. CENNIK: pełna tabela z czasem zabiegu i cenyj.
4. MISTRZOWIE: 3 kosmetyczki z imionami, specjalizacją i zdjęciem (professional beautician portrait, salon setting).
5. GALERIA EFEKTÓW: grid 8 zdjęć (przed/po lub efekty zabiegów — wygeneruj: beautiful nail art, eyelash extensions closeup, glowing skin results).
6. OPINIE KLIENTEK: 5-gwiazdkowe opinie z imionami.
7. FORMULARZ REZERWACJI: Imię, Telefon, Email, Usługa (select), Data i godzina, Kosmetyczka (select). Submit przez /api/form-submit.
8. DANE SALONU i mapa (placeholder).
9. FOOTER z Instagram/Facebook.

Paleta: #fff0f5 (jasny róż), #d4af37 (złoto), #1a1a1a (tekst). Serif font dla elegancji.`,
  },
  {
    id: "beauty-fryzjer",
    category: "beauty",
    title: "Fryzjer / Barber",
    description: "Strona salonu fryzjerskiego lub barbershop",
    prompt: `Strona salonu fryzjerskiego lub barbershopu. Ciemny klimat, maskulin lub nowoczesny unisex.

Sekcje:
1. HERO ciemny: nazwa salonu + "Twój styl. Twoje zasady." Zdjęcie (modern barbershop interior, vintage chairs, dark wood paneling).
2. USŁUGI I CENNIK: strzyżenie damskie/męskie, koloryzacja, keratyna, golenie brzytwą — tabela.
3. FRYZJERZY: 3 karty z portfolio każdego (wygeneruj: professional hairstylist portrait in salon).
4. GALERIA: grid 9 zdjęć fryzur (hair styling portfolio, various haircuts, professional photography).
5. REZERWACJA ONLINE: formularz z wyborem fryzjera i usługi.
6. FAQ i opinie.`,
  },

  // ────── Restauracja / Catering ──────
  {
    id: "food-restaurant",
    category: "food",
    featured: true,
    title: "Restauracja / Bistro",
    description: "Strona restauracji z menu i rezerwacją stolika",
    prompt: `Strona restauracji lub bistro. Klimat: ciepły, apetyczny, nowoczesna gastropub.

Sekcje:
1. HERO z nazwą restauracji + hasłem "Kuchnia, która łączy" i zdjęciem fullscreen (elegant restaurant dining room, warm lighting, beautiful table setting, cozy atmosphere).
2. O RESTAURACJI: historia, szef kuchni, filozofia "slow food". Zdjęcie szefa (chef portrait in professional kitchen).
3. MENU: zakładki — Śniadania, Obiady, Kolacje, Desery, Napoje. Każda dania z nazwą, opisem i ceną. Grid 2-kolumnowy.
4. ZDJĘCIA POTRAW: 6 zdjęć (wygeneruj: beautifully plated restaurant dishes, professional food photography, appetizing).
5. OPINIE GOŚCI: 4 opinie z Google Maps style.
6. REZERWACJA STOLIKA: Imię, Telefon, Email, Data, Godzina, Liczba osób, Specjalne życzenia (alergie, urodziny). Submit przez /api/form-submit.
7. GODZINY I ADRES: tabela godzin otwarcia + grafika mapy placeholder.
8. CATERING: sekcja o możliwości cateringu eventowego z kontaktem.
9. FOOTER.

Paleta: ciemne tło #1a1008, złoto #c9a84c, kremowy tekst #f5f0e8.`,
  },
  {
    id: "food-catering",
    category: "food",
    title: "Firma cateringowa",
    description: "Strona cateringu eventowego i dietetycznego",
    prompt: `Strona firmy cateringowej (eventy + catering dietetyczny). Czysta, apetyczna, profesjonalna.

Sekcje:
1. HERO: "Smaczne chwile na każdą okazję" + zdjęcie (professional catering buffet setup, elegant event food presentation).
2. OFERTA: 4 karty — Catering eventowy, Box diety, Wesela i uroczystości, Catering firmowy.
3. MENU TYGODNIOWE: tabela pon-pt z kategoriami kalorii.
4. REALIZACJE: 6 zdjęć cateringów na eventach.
5. KALKULATOR WYCENY: formularz — typ eventy, liczba osób, data, rodzaj menu, budżet.
6. OPINIE I CERTYFIKATY.
7. KONTAKT i obszar dowozu.`,
  },

  // ────── Usługi lokalne ──────
  {
    id: "local-hydraulik",
    category: "local_business",
    title: "Hydraulik / Instalator",
    description: "Strona usług hydraulicznych z kontaktem",
    prompt: `Strona usług hydraulicznych. Styl: profesjonalny, zaufanie, szybka reakcja.

Sekcje:
1. HERO z hasłem "Awaria? Jesteśmy na miejscu w 30 minut" + zdjęcie (professional plumber at work, tools, clean service). Duży przycisk telefonu kontaktowego.
2. USŁUGI: 8 kart — Awarie hydrauliczne 24/7, Instalacje wod-kan, Montaż armatury, Ogrzewanie, Klimatyzacja, Odpychanie rur, Wykrywanie wycieków, Pompy ciepła.
3. DLACZEGO MY: 4 liczby — 15 lat doświadczenia, 2500+ zadowolonych klientów, 30 min czas reakcji, Gwarancja 24 miesiące.
4. JAK DZIAŁAMY: 4 kroki z ikonami — Zadzwoń → Wycena → Realizacja → Gwarancja.
5. OPINIE: 5 opinii z Google Maps.
6. FORMULARZ WYCENY: Co się stało (textarea), Adres, Telefon, Pilność (select: Awaria/Zaplanowana/Oferta). Submit przez /api/form-submit.
7. OBSZAR DZIAŁANIA: lista miast w promieniu działania.
8. KONTAKT: duży numer telefonu, e-mail, godziny dyżuru.`,
  },
  {
    id: "local-electrical",
    category: "local_business",
    title: "Elektryk / Instalacje",
    description: "Strona usług elektrycznych",
    prompt: `Strona elektryka / firmy elektrycznej. Granatowo-żółty, solidność i bezpieczeństwo.

Sekcje:
1. HERO: "Profesjonalne instalacje elektryczne" + zdjęcie (electrician working on electrical panel, professional setting). Telefon kontaktowy.
2. USŁUGI: instalacje elektryczne, inteligentny dom, pomiary elektryczne, fotowoltaika, alarmy, CCTV, klimatyzacja.
3. REALIZACJE: galeria zdjęć robót.
4. CERTYFIKATY i uprawnienia SEP.
5. FORMULARZ ZAPYTANIA z opisem zakresu prac.
6. OPINIE i obszar działania.`,
  },
];

// Połącz z istniejącą biblioteką
const INDUSTRY_IDS = new Set(INDUSTRY_PROMPTS.map((p) => p.id));

export function getPromptsByCategory(category: PromptCategory): PromptDef[] {
  return [...PROMPTS_LIBRARY, ...INDUSTRY_PROMPTS].filter((p) => p.category === category);
}

export function getPromptById(id: string): PromptDef | undefined {
  return [...PROMPTS_LIBRARY, ...INDUSTRY_PROMPTS].find((p) => p.id === id);
}

export function getAllPrompts(): PromptDef[] {
  return [...PROMPTS_LIBRARY, ...INDUSTRY_PROMPTS];
}

export function getFeaturedIndustryPrompts(): PromptDef[] {
  return INDUSTRY_PROMPTS.filter((p) => p.featured);
}

// Re-export z rozszerzonym PROMPTS_LIBRARY
export const ALL_PROMPTS: PromptDef[] = [...PROMPTS_LIBRARY, ...INDUSTRY_PROMPTS];
void INDUSTRY_IDS; // suppress unused
