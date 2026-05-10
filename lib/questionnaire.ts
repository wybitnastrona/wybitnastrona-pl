/**
 * Industry-aware questionnaire for the pre-build wizard.
 * Detects the website topic from the prompt and returns tailored questions.
 */

export type Industry =
  | "fitness"
  | "ecommerce"
  | "restaurant"
  | "portfolio"
  | "saas"
  | "blog"
  | "other";

export type QuestionOption = {
  value: string;
  label: string;
  description?: string;
};

export type Question = {
  id: string;
  text: string;
  type: "single" | "multi";
  options: QuestionOption[];
};

// ─── Industry detection ──────────────────────────────────────────────────────

// Order matters — more specific patterns first.
// Ecommerce is checked before fitness so "sklep z odzieżą sportową" doesn't
// accidentally match the fitness "sport" keyword.
const INDUSTRY_KEYWORDS: Record<Industry, RegExp> = {
  ecommerce: /sklep|sprzeda|e-commerce|koszyk|produkt|zakup|shop|store|butik/i,
  restaurant: /restauracja|kawiarnia|menu|bistro|catering|jedzenie|food|bar|pub|pizzeria/i,
  portfolio: /portfolio|freelancer|fotograf|grafik|projektant|designer|agencja|architekt/i,
  saas: /saas|dashboard|startup|platforma|software|crm|erp/i,
  blog: /blog|artykul|wpis|newsy|magazyn|content|poradnik|przepisy/i,
  // Fitness keywords narrowed — "sport" alone is too generic (matches "sportową" in clothing)
  fitness: /trener\s+personal|personal\s+train|fitness|si[lł]owni|gym|trening|wellness|yoga|pilates/i,
  other: /.*/,
};

export function detectIndustry(prompt: string): Industry {
  for (const [industry, regex] of Object.entries(INDUSTRY_KEYWORDS) as [
    Industry,
    RegExp,
  ][]) {
    if (industry !== "other" && regex.test(prompt)) return industry;
  }
  return "other";
}

// ─── Question banks ──────────────────────────────────────────────────────────

const STYLE_QUESTION: Question = {
  id: "style",
  text: "Jaki styl wizualny preferujesz?",
  type: "single",
  options: [
    {
      value: "dark-energetic",
      label: "Mroczny i energetyczny",
      description: "Ciemne tło, neonowe akcenty, zdjęcia siłowni",
    },
    {
      value: "light-minimal",
      label: "Jasny i minimalistyczny",
      description: "Biel, duża typografia, dużo przestrzeni",
    },
    {
      value: "warm-cozy",
      label: "Ciepły i przytulny",
      description: "Beże, zieleń, naturalne materiały",
    },
    {
      value: "bold-colorful",
      label: "Odważny i kolorowy",
      description: "Mocne kolory, dynamiczne kąty, wyraziste CTA",
    },
  ],
};

const CONTENT_QUESTION: Question = {
  id: "content",
  text: "Czy mam użyć przykładowych danych?",
  type: "single",
  options: [
    {
      value: "generate",
      label: "Tak, wymyśl wszystko",
      description: "Użyję placeholderów które łatwo podmienisz",
    },
    {
      value: "provide",
      label: "Podam dane później",
      description: "Zaznacz miejsca do uzupełnienia",
    },
  ],
};

const QUESTIONS_BY_INDUSTRY: Record<Industry, Question[]> = {
  fitness: [
    STYLE_QUESTION,
    {
      id: "sections",
      text: "Jakie sekcje mają się znaleźć na stronie?",
      type: "multi",
      options: [
        { value: "hero", label: "Hero z CTA", description: "Nagłówek z wezwaniem do działania" },
        { value: "about", label: "O trenerze", description: "Bio, certyfikaty, doświadczenie" },
        { value: "services", label: "Usługi / Oferta", description: "Pakiety treningów, coaching" },
        { value: "pricing", label: "Cennik", description: "Tabela z pakietami i cenami" },
        { value: "testimonials", label: "Opinie klientów", description: "Recenzje i transformacje" },
        { value: "contact", label: "Kontakt / Booking", description: "Formularz zapisu na konsultację" },
      ],
    },
    CONTENT_QUESTION,
  ],
  ecommerce: [
    STYLE_QUESTION,
    {
      id: "sections",
      text: "Co powinien zawierać Twój sklep?",
      type: "multi",
      options: [
        { value: "hero", label: "Banner promocyjny", description: "Główna oferta na stronie głównej" },
        { value: "catalog", label: "Katalog produktów", description: "Siatka z produktami i filtrami" },
        { value: "product-page", label: "Strona produktu", description: "Zdjęcia, opis, dodaj do koszyka" },
        { value: "cart", label: "Koszyk i checkout", description: "Podsumowanie zamówienia" },
        { value: "testimonials", label: "Opinie", description: "Recenzje klientów" },
        { value: "newsletter", label: "Newsletter", description: "Formularz zapisu na newsletter" },
      ],
    },
    CONTENT_QUESTION,
  ],
  restaurant: [
    STYLE_QUESTION,
    {
      id: "sections",
      text: "Co chcesz pokazać na stronie restauracji?",
      type: "multi",
      options: [
        { value: "hero", label: "Hero ze zdjęciem", description: "Klimatyczne zdjęcie i tagline" },
        { value: "menu", label: "Menu / Karta", description: "Dania z cenami i opisami" },
        { value: "gallery", label: "Galeria", description: "Zdjęcia potraw i wnętrza" },
        { value: "reservation", label: "Rezerwacja stolika", description: "Formularz z datą i godziną" },
        { value: "about", label: "O nas", description: "Historia, szef kuchni" },
        { value: "contact", label: "Kontakt i mapa", description: "Adres, godziny, mapa" },
      ],
    },
    CONTENT_QUESTION,
  ],
  portfolio: [
    STYLE_QUESTION,
    {
      id: "sections",
      text: "Jakie sekcje powinno mieć Twoje portfolio?",
      type: "multi",
      options: [
        { value: "hero", label: "Hero / Prezentacja", description: "Imię, zawód, krótkie bio" },
        { value: "projects", label: "Projekty", description: "Siatka z case studies" },
        { value: "skills", label: "Umiejętności", description: "Stack technologiczny, narzędzia" },
        { value: "experience", label: "Doświadczenie", description: "Historia pracy, edukacja" },
        { value: "testimonials", label: "Rekomendacje", description: "Opinie klientów / pracodawców" },
        { value: "contact", label: "Kontakt", description: "Formularz lub dane kontaktowe" },
      ],
    },
    CONTENT_QUESTION,
  ],
  saas: [
    STYLE_QUESTION,
    {
      id: "sections",
      text: "Co powinna zawierać strona Twojej aplikacji?",
      type: "multi",
      options: [
        { value: "hero", label: "Hero z CTA", description: "Wartość produktu + przycisk rejestracji" },
        { value: "features", label: "Funkcje", description: "Lista głównych możliwości" },
        { value: "pricing", label: "Cennik", description: "Plany: Free / Pro / Enterprise" },
        { value: "faq", label: "FAQ", description: "Najczęstsze pytania" },
        { value: "testimonials", label: "Opinie", description: "Referencje od klientów" },
        { value: "integrations", label: "Integracje", description: "Loga partnerów / integracji" },
      ],
    },
    CONTENT_QUESTION,
  ],
  blog: [
    STYLE_QUESTION,
    {
      id: "sections",
      text: "Co chcesz na swoim blogu?",
      type: "multi",
      options: [
        { value: "hero", label: "Hero z ostatnim wpisem", description: "Wyróżniony artykuł na górze" },
        { value: "listing", label: "Lista wpisów", description: "Siatka lub lista artykułów" },
        { value: "categories", label: "Kategorie / Tagi", description: "Filtrowanie wpisów" },
        { value: "newsletter", label: "Newsletter", description: "Zapis na powiadomienia" },
        { value: "about", label: "O autorze", description: "Bio i media społecznościowe" },
        { value: "sidebar", label: "Sidebar", description: "Popularne wpisy, szukaj" },
      ],
    },
    CONTENT_QUESTION,
  ],
  other: [
    STYLE_QUESTION,
    {
      id: "sections",
      text: "Jakie sekcje powinny znaleźć się na stronie?",
      type: "multi",
      options: [
        { value: "hero", label: "Hero / Nagłówek", description: "Główna sekcja z CTA" },
        { value: "about", label: "O nas / O mnie", description: "Opis firmy lub osoby" },
        { value: "services", label: "Usługi / Oferta", description: "Co oferujesz" },
        { value: "pricing", label: "Cennik", description: "Plany lub pakiety" },
        { value: "testimonials", label: "Opinie", description: "Referencje klientów" },
        { value: "contact", label: "Kontakt", description: "Formularz lub dane" },
      ],
    },
    CONTENT_QUESTION,
  ],
};

export function getQuestions(industry: Industry): Question[] {
  return QUESTIONS_BY_INDUSTRY[industry] ?? QUESTIONS_BY_INDUSTRY.other;
}

// ─── Prompt enrichment ───────────────────────────────────────────────────────

/**
 * Builds an enriched prompt from the original user prompt and wizard answers.
 * Works with both static (preset) and dynamic (AI-generated) questions —
 * it reads question/option labels from the question bank passed in.
 */
export function buildEnrichedPrompt(
  originalPrompt: string,
  answers: Record<string, string | string[]>,
  questions?: Question[],
): string {
  const lines: string[] = [originalPrompt, "", "Dodatkowe wymagania od użytkownika:"];
  let hasAny = false;

  for (const [qId, ans] of Object.entries(answers)) {
    if (!ans || (Array.isArray(ans) && ans.length === 0)) continue;

    // Find matching question for human-readable label
    const q = questions?.find((qq) => qq.id === qId);

    if (Array.isArray(ans)) {
      // Multi-select: resolve option labels if available
      const labels = ans.map((v) => {
        const opt = q?.options.find((o) => o.value === v);
        return opt ? opt.label : v;
      });
      if (q) {
        lines.push(`- ${q.text}: ${labels.join(", ")}`);
      } else {
        lines.push(`- ${qId}: ${labels.join(", ")}`);
      }
    } else {
      // Single-select
      const opt = q?.options.find((o) => o.value === ans);
      const label = opt ? opt.label : ans;
      const desc = opt?.description ? ` (${opt.description})` : "";
      if (q) {
        lines.push(`- ${q.text}: ${label}${desc}`);
      } else {
        lines.push(`- ${qId}: ${label}`);
      }
    }
    hasAny = true;
  }

  if (!hasAny) return originalPrompt;
  return lines.join("\n");
}
