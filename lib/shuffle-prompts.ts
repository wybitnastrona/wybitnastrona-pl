/**
 * Pula 50 zróżnicowanych promptów dla przycisku "Losuj" w CreationHero.
 *
 * Colouree: żłobki, hotele, sklepy, usługi, portfolio, restauracje, kliniki,
 * SaaS, narzędzia, eventy, branże lokalne i inne.
 *
 * Każdy prompt jest opisem kompletnej strony z kluczowymi sekcjami,
 * co gwarantuje że AI wygeneruje bogatą zawartość od razu.
 */

export type ShufflePrompt = {
  label: string;
  category: string;
  prompt: string;
};

export const SHUFFLE_PROMPTS: ShufflePrompt[] = [
  // ─── Usługi lokalne ────────────────────────────────────────
  {
    label: "Hydraulik 24/7",
    category: "Usługi lokalne",
    prompt: "Nowoczesna strona dla hydraulika z sekcją usług (awarie 24/7, instalacje, montaż), cennikiem, formularzem zgłoszenia awarii, obszarem działania i dużym numerem telefonu. Ciemno-niebieska kolorystyka, poczucie profesjonalizmu i szybkości reakcji.",
  },
  {
    label: "Firma sprzątająca",
    category: "Usługi lokalne",
    prompt: "Strona firmy sprzątającej dla domu i biur. Sekcje: typy usług (mieszkania, biura, po remoncie, okna), cennik, strefy działania, zdjęcia efektów, formularz wyceny online. Czysty, biały design z zielonymi akcentami symbolizującymi czystość.",
  },
  {
    label: "Elektryk — instalacje",
    category: "Usługi lokalne",
    prompt: "Strona elektryka i firmy elektrycznej. Usługi: instalacje elektryczne, inteligentny dom, pomiary, fotowoltaika, monitoring CCTV. Certyfikaty SEP, galeria realizacji, formularz zapytania. Granatowo-żółty design, profesjonalizm i bezpieczeństwo.",
  },
  {
    label: "Malarz i dekorator",
    category: "Usługi lokalne",
    prompt: "Strona malarza i dekoratora wnętrz. Galeria zrealizowanych projektów (mieszkania, domy, biura), rodzaje usług (malowanie, tapetowanie, efekty dekoracyjne), cennik za m², obszar działania, opinie klientów i formularz kontaktowy.",
  },
  {
    label: "Serwis AGD",
    category: "Usługi lokalne",
    prompt: "Serwis naprawy sprzętu AGD (pralki, zmywarki, lodówki, piekarniki). Sekcje: obsługiwane marki i modele, czas naprawy, gwarancja na prace, cennik orientacyjny, możliwość zamówienia wizyty online. Pomarańczowo-szary design.",
  },

  // ─── Gastronomia ──────────────────────────────────────────
  {
    label: "Restauracja włoska",
    category: "Restauracja",
    prompt: "Elegancka strona restauracji włoskiej. Hero z atmosferycznym zdjęciem sali, menu (antipasti, pasta, pizza, dolci), galeria potraw, godziny i rezerwacja stolika przez formularz. Ciepłe kolory: czerwień, kremowy, zielony.",
  },
  {
    label: "Kawiarnia specialty coffee",
    category: "Restauracja",
    prompt: "Strona kawiarni z specialty coffee. Karta napojów z opisami origin kawy, galeria wnętrza (industrialny design), sklep online z ziarnami i akcesoriami, harmonogram eventów (cupping, barista workshops), formularz rezerwacji. Brąz, beż, czarny.",
  },
  {
    label: "Food truck",
    category: "Restauracja",
    prompt: "Strona food trucka z burgery lub streetfood. Mapa z aktualną lokalizacją (placeholder), aktualny grafik lokalizacji w tygodniu, karta menu z cenami, galeria jedzenia z telefonu, zamówienie catering eventowy, social media feed. Żywe kolory.",
  },
  {
    label: "Catering ślubny",
    category: "Catering",
    prompt: "Profesjonalna strona firmy cateringowej specjalizującej się w weselach i eventach. Pakiety menu (standard, premium, fine dining), galeria realizacji, liczba obsłużonych gości, formularz wyceny z datą i liczbą osób. Elegancki, biały design.",
  },
  {
    label: "Cukiernia i tort na zamówienie",
    category: "Gastronomia",
    prompt: "Strona cukierni z tortami na zamówienie. Galeria tortów weselnych, urodzinowych i tematycznych (grid zdjęć z filtrowaniem), cennik wg tieru, formularz zamówienia z datą odbioru i opcjami personalizacji. Różowy, złoty, kremowy design.",
  },

  // ─── Zdrowie i uroda ──────────────────────────────────────
  {
    label: "Gabinet stomatologiczny",
    category: "Klinika",
    prompt: "Nowoczesna strona gabinetu stomatologicznego. Usługi (leczenie, protetyka, ortodoncja, wybielanie, implanty), kadra z zdjęciami i specjalizacjami, cennik, formularz rejestracji online z wyborem lekarza. Biało-niebieski, czysty design.",
  },
  {
    label: "Salon fryzjerski",
    category: "Uroda",
    prompt: "Strona stylowego salonu fryzjerskiego. Usługi i cennik (strzyżenie damskie/męskie, koloryzacja, keratyna), portfolio fryzur w galerii, 3 fryzjerki z opisem specjalizacji, system rezerwacji online, opinie Google. Ciemny, nowoczesny design.",
  },
  {
    label: "Studio tatuażu",
    category: "Uroda",
    prompt: "Strona studia tatuażu. Portfolio artystów (filtrowalne galerie per styl: realism, blackwork, watercolor, traditional), biografie artystów, FAQ (pielęgnacja, ceny, sesje), formularz konsultacji. Ciemny industrialny design, edgy.",
  },
  {
    label: "Masaż i relaks",
    category: "Wellness",
    prompt: "Strona gabinetu masażu i wellness. Rodzaje masaży (relaksacyjny, leczniczy, sportowy, tajski, gorące kamienie) z opisami i cenami, zdjęcia gabinetu, harmonogram dostępności, rezerwacja online. Spokojny, beżowo-zielony design spa.",
  },
  {
    label: "Dietetyk online",
    category: "Zdrowie",
    prompt: "Strona dietetyka klinicznego oferującego konsultacje online. Pakiety (jednorazowa konsultacja, 3-miesięczna współpraca, plan redukcji), efekty klientów, bezpłatna analiza BMI (interaktywny kalkulator), blog z artykułami, zapis online.",
  },

  // ─── Edukacja i dzieci ────────────────────────────────────
  {
    label: "Szkoła językowa",
    category: "Edukacja",
    prompt: "Strona szkoły językowej. Oferta kursów (angielski A1-C2, hiszpański, niemicki, online/offline), poziomy i ceny, harmonogram grup, kadra lektorów, darmowa lekcja próbna przez formularz, blog językowy. Żywe, przyjazne kolory.",
  },
  {
    label: "Korepetytor matematyki",
    category: "Edukacja",
    prompt: "Strona korepetytora matematyki i fizyki. Zakres: szkoła podstawowa, liceum, matura, studia. Tryby: online i stacjonarne. Wyniki uczniów (% zdawalności matur), harmonogram dostępności, pierwsze zajęcia bezpłatne, formularz zapisu.",
  },
  {
    label: "Żłobek z placówką",
    category: "Dzieci",
    prompt: "Ciepła strona żłobka dla dzieci 0-3 lat. Harmonogram dnia, cennik (pół dnia/cały dzień/jednorazowo), galeria sali zabaw i zajęć, opinie rodziców, kadra z certyfikatami, formularz zapisu z wiekiem dziecka i preferowanym terminem.",
  },
  {
    label: "Terapia logopedyczna",
    category: "Zdrowie dzieci",
    prompt: "Strona gabinetu logopedycznego dla dzieci i dorosłych. Zaburzenia: wady wymowy, jąkanie, afazja, autyzm. Metody terapii, ceny za sesję, logopeda z wykształceniem, formularz rejestracji z wiekiem pacjenta. Przyjazny, pastelowy design.",
  },

  // ─── Nieruchomości i budownictwo ──────────────────────────
  {
    label: "Deweloper mieszkań",
    category: "Nieruchomości",
    prompt: "Strona dewelopera mieszkań. Aktywne inwestycje z mapą i etapem budowy, wyszukiwarka mieszkań (filtry: metraż, piętro, cena), galeria wizualizacji 3D, standard wykończenia, formularz kontaktowy do doradcy. Nowoczesny, szary design.",
  },
  {
    label: "Agencja nieruchomości",
    category: "Nieruchomości",
    prompt: "Strona agencji nieruchomości. Wyszukiwarka ofert (domy, mieszkania, działki, komercyjne) z filtrami, najnowsze oferty w grid, team agentów, statystyki (liczba transakcji, lata na rynku), bezpłatna wycena nieruchomości.",
  },
  {
    label: "Firma budowlana",
    category: "Budownictwo",
    prompt: "Strona generalnego wykonawcy budynków. Zakres: domy jednorodzinne, remonty, wykończenia. Realizacje z galerią (przed/po), kosztorys online (formularz z parametrami), kadra i sprzęt, certyfikaty, obszar działania.",
  },

  // ─── Fitnes i sport ──────────────────────────────────────
  {
    label: "Siłownia i fitness klub",
    category: "Sport",
    prompt: "Strona siłowni i fitness klubu. Grafik zajęć grupowych (interaktywna tabelka godzin), cennik karnetów (standard/premium/family), kadra trenerów, galeria siłowni, free trial przez formularz, blog ze wskazówkami treningowymi.",
  },
  {
    label: "Trener personalny",
    category: "Sport",
    prompt: "Dynamiczna strona trenera personalnego. Specjalizacje (redukcja, budowa masy, crossfit, bieganie), zdjęcia treningów i transformacji klientów, pakiety (1 sesja / 4 sesje / miesiąc), certyfikaty i osiągnięcia, zapis na darmową konsultację.",
  },
  {
    label: "Szkoła jogi",
    category: "Wellness",
    prompt: "Spokojna strona szkoły jogi. Style (hatha, vinyasa, yin, prenatal), grafik zajęć, ceny karnetów i jednorazowych wejść, nauczyciele z bio i zdjęciami, galeria sali, warsztaty i retreaty. Neutralne kolory, spokojny nastrój.",
  },
  {
    label: "Klub bokserski",
    category: "Sport",
    prompt: "Energetyczna strona klubu bokserskiego. Treningi (amatorskie, wyczynowe, dzieci), grafik, trenerzy z osiągnięciami, galeria walk i treningów, cennik, zapisy dla dzieci od 8 lat. Czarno-czerwony, mocny design.",
  },

  // ─── E-commerce ────────────────────────────────────────────
  {
    label: "Sklep z biżuterią",
    category: "E-commerce",
    prompt: "Elegancki sklep z biżuterią ręcznie robioną. Grid produktów z filtrowaniem (pierścionki, naszyjniki, kolczyki, bransoletki), karta produktu ze zdjęciami z wielu stron, możliwość personalizacji, bezpieczna kasa, sekcja o twórcy.",
  },
  {
    label: "Sklep z kawą",
    category: "E-commerce",
    prompt: "Sklep online z kawą specialty. Catalog: ziarna (origin, profil smaku), kapsułki, akcesoria. Subskrypcja miesięczna (box degustacyjny), blog o kawie, quiz 'jaka kawa dla mnie?', koszyk i checkout. Brązowy, ciepły design.",
  },
  {
    label: "Sklep z suplementami",
    category: "E-commerce",
    prompt: "Sklep z suplementami diety i sportu. Kategorie (białko, kreatyna, przedtreningowe, witaminy), filtry (cel: masa / redukcja / zdrowie), karty produktów z opisem i składem, blog dietetyczny, program lojalnościowy. Zielono-czarny design.",
  },
  {
    label: "Kwiaciarnia online",
    category: "E-commerce",
    prompt: "Strona i sklep kwiaciarni online. Bukiety na okazje (urodziny, śluby, pogrzeby, dzień matki), composer (stwórz własny bukiet), dostawa tego samego dnia w mieście, subskrypcja kwiatów co tydzień, certyfikat jako prezent.",
  },

  // ─── Eventy i kultura ─────────────────────────────────────
  {
    label: "Agencja eventowa",
    category: "Eventy",
    prompt: "Strona agencji eventowej. Rodzaje eventów (wesela, konferencje, team-building, urodziny korporacyjne), portfolio realizacji z galerią i opisem, pakiety, testimoniale klientów, formularz zapytania ofertowego z datą i budżetem.",
  },
  {
    label: "DJ i muzyk na eventy",
    category: "Eventy",
    prompt: "Strona DJ'a lub muzyka na wesela i eventy. Demo tracków (player audio w sekcji), typy eventów, relacje fotograficzne z imprez, pakiety (2h/4h/full event), miks przykładowy, formularz dostępności i wyceny. Ciemny, klimatyczny design.",
  },
  {
    label: "Fotograf ślubny",
    category: "Fotografia",
    prompt: "Portfolio fotografa ślubnego. Sesje podzielone na galerie (wesela 2023, 2024, plener, sesje narzeczeńskie), styl fotografii opisany słowami, pakiety cenowe, opinie par, formularz dostępności z datą ślubu. Minimalistyczny, jasny design.",
  },
  {
    label: "Wideofilmowanie ślubne",
    category: "Fotografia",
    prompt: "Strona firmy filmującej wesela. Embed video clips (teledysk, film ślubny, social media cut), pakiety (Teledysk 3min / Film 15min / Full Day), sprzęt i dron, opinie, formularz zapytania. Cinematographic, ciemny design.",
  },

  // ─── Technologia i SaaS ───────────────────────────────────
  {
    label: "Startup SaaS — narzędzie HR",
    category: "SaaS",
    prompt: "Landing page narzędzia HR do zarządzania urlopami i obecnościami. Hero z animowanym dashboardem, 3 plany cenowe (starter/business/enterprise), integracje (Slack, Google Workspace), testimoniale HR managerów, darmowe 14-dni trial.",
  },
  {
    label: "Agencja SEO",
    category: "Marketing",
    prompt: "Strona agencji SEO i marketingu cyfrowego. Usługi (pozycjonowanie, Google Ads, content marketing, social media), case studies z wynikami (liczby!), pakiety, narzędzia używane przez agencję, bezpłatny audyt SEO przez formularz.",
  },
  {
    label: "Tworzenie aplikacji mobilnych",
    category: "IT",
    prompt: "Strona firmy IT tworzącej aplikacje mobilne. Portfolio aplikacji (iOS/Android) z opisem i screenshotami, stack technologiczny, process współpracy (briefing → design → dev → publikacja), wycena na podstawie briefu, case studies.",
  },

  // ─── Hotel i turystyka ─────────────────────────────────────
  {
    label: "Apartamenty wakacyjne",
    category: "Turystyka",
    prompt: "Strona z apartamentami wakacyjnymi nad morzem lub w górach. Galeria każdego apartamentu (zdjęcia pokojów, widok), udogodnienia (basen, parking, WiFi, grilla), ceny per sezon, formularz rezerwacji z kalendarzem dostępności.",
  },
  {
    label: "Biuro podróży",
    category: "Turystyka",
    prompt: "Strona biura podróży z ofertami wyjazdów. Katalog wycieczek z filtrowaniem (kraj, termin, cena, typ: all-inclusive / last minute), wycieczka tygodnia, newsletter z ofertami, formularz zapytania o wyjazd grupowy.",
  },
  {
    label: "Pensjonat w górach",
    category: "Agroturystyka",
    prompt: "Przytulna strona pensjonatu w górach. Pokoje i apartamenty z cenami i zdjęciami, atrakcje w okolicy (szlaki, narty, wycieczki), jadłodajnia z lokalną kuchnią (menu), formularz rezerwacji z datami, opinie TripAdvisor.",
  },

  // ─── Profesje i consulting ────────────────────────────────
  {
    label: "Kancelaria prawna",
    category: "Prawo",
    prompt: "Profesjonalna strona kancelarii prawnej. Specjalizacje (prawo cywilne, gospodarcze, rodzinne, karne, nieruchomości), prawnicy z doświadczeniem, publikacje i artykuły, honorarium (sposób rozliczania), formularz konsultacji. Navy blue design.",
  },
  {
    label: "Biuro rachunkowe",
    category: "Finanse",
    prompt: "Strona biura rachunkowego. Pakiety usług (JDG, spółki, pełna księgowość), co zyskujesz przesyłając dokumenty online, kalkulator oszczędności czasu, team księgowych z certyfikatami, formularz przejęcia ksiąg. Granatowy design.",
  },
  {
    label: "Coach biznesowy",
    category: "Consulting",
    prompt: "Strona coacha biznesowego i lifecoacha. Historia i metodologia, obszary (liderstwo, sprzedaż, efektywność, zmiana kariery), video testimoniale, pakiety (jednorazowa / 3-miesięczna współpraca), bezpłatna konsultacja discovery call.",
  },

  // ─── Kreatywne i artystyczne ──────────────────────────────
  {
    label: "Studio architektoniczne",
    category: "Architektura",
    prompt: "Minimalistyczne portfolio studia architektonicznego. Realizacje podzielone na kategorie (mieszkania, domy, komercyjne, wnętrza), każda z galerią i opisem projektu, filozofia projektowania, kadra, formularz briefingu nowego projektu.",
  },
  {
    label: "Artysta malarz",
    category: "Sztuka",
    prompt: "Portfolio artysty malarza. Galeria prac podzielona na serie i techniki (olej, akryl, akwarela), bio artysty, sklep z oryginałami i printami, możliwość zamówienia portretu na zlecenie, wystawy i wydarzenia. Artystyczny, ekspresyjny design.",
  },
  {
    label: "Studio graficzne",
    category: "Design",
    prompt: "Strona i portfolio studia graficznego. Usługi (identyfikacja wizualna, branding, pakowanie, social media, strony), case studies klientów (przed/po logo i brandingu), cennik orientacyjny, formularz briefingu projektu.",
  },
  {
    label: "Fotograf produktowy",
    category: "Fotografia",
    prompt: "Portfolio fotografa produktowego dla e-commerce. Galerie według branży (biżuteria, kosmetyki, jedzenie, elektronika, moda), pakiety (5/15/50 produktów), zdjęcia white-bg i lifestyle, formularz zlecenia sesji z datą i ilością.",
  },

  // ─── Motoryzacja ──────────────────────────────────────────
  {
    label: "Warsztat samochodowy",
    category: "Auto",
    prompt: "Strona warsztatu samochodowego. Usługi (mechanika, diagnostyka, klimatyzacja, opony, serwis olejowy), umów wizytę online (formularz z marką auta, rokiem i opisem usterki), cennik orientacyjny, opinie Google. Grafitowy, motoryzacyjny design.",
  },
  {
    label: "Komis samochodowy",
    category: "Auto",
    prompt: "Strona komisu samochodowego. Aktualne ogłoszenia z filtrami (marka, cena, rok, przebieg), karta pojazdu z galerią zdjęć, możliwość test drive przez formularz, skup aut za gotówkę, finansowanie na miejscu. Profesjonalny design.",
  },
  {
    label: "Wypożyczalnia samochodów",
    category: "Auto",
    prompt: "Strona wypożyczalni samochodów. Flota podzielona na kategorie (miejskie, SUV, premium, dostawcze), ceny za dobę/tydzień/miesiąc, formularz rezerwacji z datami i odbiorem, zasady wypożyczenia, FAQ.",
  },
];

/**
 * Zwraca losowy prompt z puli, opcjonalnie filtrowany do trybu web.
 */
export function getRandomShufflePrompt(): ShufflePrompt {
  return SHUFFLE_PROMPTS[Math.floor(Math.random() * SHUFFLE_PROMPTS.length)];
}

/**
 * Zwraca N unikalnych losowych promptów.
 */
export function getRandomShufflePrompts(n: number): ShufflePrompt[] {
  const shuffled = [...SHUFFLE_PROMPTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, SHUFFLE_PROMPTS.length));
}
