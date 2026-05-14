/**
 * Static-snapshot generator dla miniaturki projektu (dashboard cards).
 *
 * Bierze pliki projektu (React/Vite — `/src/App.tsx`, `/src/data/config.ts`,
 * `/src/components/sections/*.tsx`), wyciąga tekstowe wartości i renderuje
 * uproszczony HTML, ktory:
 *  - moze byc bezpiecznie wstawiony do `<iframe srcDoc>` z `sandbox=""`,
 *  - ma podstawowe style przez Tailwind utility classes (CDN-script wycinany —
 *    w to miejsce wstawiamy juz inline play.tailwindcss z preconfigured palette),
 *  - blokuje wszelka interakcje (JS wylaczony przez sandbox),
 *  - hover na buttony/linki dziala dzieki CSS `:hover`.
 *
 * Nie jest to pelny renderer React — to przyblizenie "co jest na stronie", ktore
 * wyglada jak "screenshot" w karcie. Lepiej miec uproszczone niz puste pole.
 */

import type { ProjectFiles } from "@/lib/types/project";

/**
 * Build static HTML snapshot for a project's files map.
 * Returns `null` if generation isn't possible (no App.tsx / sections found).
 */
export function buildPreviewSnapshot(files: ProjectFiles): string | null {
  const app = files["/src/App.tsx"]?.code ?? files["/src/App.jsx"]?.code ?? "";
  if (!app || app.length < 50) return null;

  const sections: { name: string; code: string }[] = [];
  for (const [path, file] of Object.entries(files)) {
    if (!path.startsWith("/src/components/sections/")) continue;
    if (!path.endsWith(".tsx") && !path.endsWith(".jsx")) continue;
    const name = path.split("/").pop()!.replace(/\.(tsx|jsx)$/, "");
    sections.push({ name, code: file.code });
  }

  const configData =
    files["/src/data/config.ts"]?.code ??
    files["/src/data/config.tsx"]?.code ??
    "";

  // Heuristic title from config or fallback
  const title = extractStringLiteral(configData, /(?:title|brandName|companyName)/i) ?? "Strona";
  const tagline = extractStringLiteral(configData, /(?:tagline|subtitle|description|hero(?:Subtitle|Description))/i);

  // Pobierz hero image URL z configa (jezeli AI uzyl generateImage)
  const heroImg = extractStringLiteral(configData, /hero(?:Image|Img|Url|Src)?/i, true);

  // Wybierz max 4 sekcje (po Hero, About, Services, Pricing — heurystyka po nazwie)
  const orderedNames = orderSections(sections.map((s) => s.name));

  // Wycinamy tytuly sekcji + krotkie opisy
  const blocks = orderedNames.slice(0, 5).map((name) => {
    const code = sections.find((s) => s.name === name)?.code ?? "";
    const headline = extractFirstJsxText(code) ?? deCamel(name);
    return { name, headline };
  });

  const accent = extractAccentColor(files);

  return renderHtml({
    title,
    tagline,
    heroImg,
    blocks,
    accent,
  });
}

function extractStringLiteral(
  source: string,
  needleRegex: RegExp,
  preferUrl = false,
): string | null {
  if (!source) return null;
  const re = new RegExp(
    `${needleRegex.source}\\s*[:=]\\s*["\\'\\\`]([^"'\\\`]{1,200})["\\'\\\`]`,
    "i",
  );
  const m = source.match(re);
  if (!m) return null;
  const val = m[1].trim();
  if (preferUrl && !/^https?:\/\//.test(val) && !val.startsWith("/")) {
    return null;
  }
  return val || null;
}

function extractFirstJsxText(code: string): string | null {
  // Match first <h1>...</h1> or <h2>...</h2> in JSX
  const m = code.match(/<h[12][^>]*>([^<{]+)</);
  if (m) return m[1].trim().slice(0, 80);
  // Or first string literal in jsx body
  const m2 = code.match(/>\s*([A-ZŁŚĆŻŹÓĄĘŃ][^<{]{3,80})</);
  return m2 ? m2[1].trim() : null;
}

function deCamel(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function orderSections(names: string[]): string[] {
  const priority: Record<string, number> = {
    nav: 0,
    navbar: 0,
    hero: 1,
    about: 2,
    onas: 2,
    services: 3,
    uslugi: 3,
    features: 4,
    pricing: 5,
    cennik: 5,
    testimonials: 6,
    opinie: 6,
    contact: 7,
    kontakt: 7,
    footer: 99,
  };
  return [...names].sort((a, b) => {
    const pa = priority[a.toLowerCase()] ?? 50;
    const pb = priority[b.toLowerCase()] ?? 50;
    return pa - pb;
  });
}

function extractAccentColor(files: ProjectFiles): string {
  const styles =
    files["/src/styles.css"]?.code ??
    files["/src/index.css"]?.code ??
    files["/src/globals.css"]?.code ??
    "";
  const m = styles.match(/--accent\s*:\s*([^;]+);/);
  if (m) return m[1].trim();
  return "oklch(0.7 0.22 250)";
}

function renderHtml(args: {
  title: string;
  tagline: string | null;
  heroImg: string | null;
  blocks: { name: string; headline: string }[];
  accent: string;
}): string {
  const safe = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const heroSection = args.heroImg
    ? `<section style="background:linear-gradient(180deg,rgba(0,0,0,0.55),rgba(0,0,0,0.3)),url('${safe(args.heroImg)}') center/cover">`
    : `<section style="background:linear-gradient(135deg,var(--bg-card),var(--bg))">`;

  const blocksHtml = args.blocks
    .filter((b) => b.name.toLowerCase() !== "nav" && b.name.toLowerCase() !== "navbar")
    .map(
      (b) => `
      <section class="block">
        <div class="block-eyebrow">${safe(deCamel(b.name))}</div>
        <h2 class="block-title">${safe(b.headline)}</h2>
        <div class="block-grid">
          <div class="card"></div>
          <div class="card"></div>
          <div class="card"></div>
        </div>
      </section>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=1280, initial-scale=1" />
<title>${safe(args.title)}</title>
<style>
  :root {
    --bg: oklch(0.10 0 0);
    --bg-card: oklch(0.13 0 0);
    --text: oklch(0.96 0 0);
    --text-muted: oklch(0.55 0 0);
    --border: oklch(0.22 0 0);
    --accent: ${args.accent};
    --accent-fg: oklch(0.99 0 0);
    --radius-lg: 16px;
  }
  *,*::before,*::after { box-sizing: border-box; pointer-events: none; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  a, button { pointer-events: auto; transition: opacity .15s, transform .15s; cursor: pointer; }
  a:hover, button:hover { opacity: .85; transform: translateY(-1px); }
  nav { display: flex; align-items: center; justify-content: space-between; padding: 18px 32px; border-bottom: 1px solid var(--border); background: rgba(0,0,0,.4); backdrop-filter: blur(8px); position: sticky; top: 0; }
  nav .brand { font-weight: 600; font-size: 16px; }
  nav .links { display: flex; gap: 18px; font-size: 13px; color: var(--text-muted); }
  nav .links a { color: inherit; text-decoration: none; }
  nav .cta { background: var(--accent); color: var(--accent-fg); padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 500; }
  section.hero { padding: 80px 32px 90px; text-align: center; min-height: 360px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  section.hero h1 { font-size: 42px; font-weight: 600; margin: 0 0 16px; max-width: 760px; line-height: 1.15; letter-spacing: -0.02em; }
  section.hero p { font-size: 16px; color: var(--text-muted); margin: 0 0 28px; max-width: 560px; }
  section.hero .cta-row { display: flex; gap: 12px; }
  section.hero .cta-primary { background: var(--accent); color: var(--accent-fg); padding: 11px 22px; border-radius: 10px; font-weight: 500; }
  section.hero .cta-secondary { border: 1px solid var(--border); color: var(--text); padding: 11px 22px; border-radius: 10px; }
  section.block { padding: 56px 32px; border-top: 1px solid var(--border); }
  .block-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent); margin-bottom: 10px; }
  .block-title { font-size: 28px; margin: 0 0 28px; font-weight: 600; letter-spacing: -0.01em; }
  .block-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); height: 132px; }
  footer { padding: 32px; text-align: center; font-size: 12px; color: var(--text-muted); border-top: 1px solid var(--border); }
</style>
</head>
<body>
  <nav>
    <div class="brand">${safe(args.title)}</div>
    <div class="links">
      <a href="#uslugi">Usługi</a>
      <a href="#cennik">Cennik</a>
      <a href="#kontakt">Kontakt</a>
    </div>
    <a class="cta" href="#kontakt">Rozpocznij</a>
  </nav>

  ${heroSection.replace("<section", '<section class="hero"')}
    <h1>${safe(args.title)}</h1>
    <p>${safe(args.tagline ?? "Profesjonalne rozwiązania dopasowane do Twoich potrzeb.")}</p>
    <div class="cta-row">
      <a class="cta-primary" href="#kontakt">Skontaktuj się</a>
      <a class="cta-secondary" href="#uslugi">Dowiedz się więcej</a>
    </div>
  </section>

  ${blocksHtml}

  <footer>© ${new Date().getFullYear()} ${safe(args.title)}. Wszystkie prawa zastrzeżone.</footer>
</body>
</html>`;
}

/**
 * Async wrapper — odpalany fire-and-forget z route handlerow.
 * Zwraca void, loguje bledy do konsoli. Type loose (`unknown`) bo supabase
 * client przychodzi z dwoch wariantow: server client (createClient) i service
 * role (createClient z supabase-js) — oba implementuja from().update().eq().
 */
type MinimalSupabaseClient = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (
        column: string,
        value: string,
      ) => PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

export async function persistPreviewSnapshot(
  supabase: unknown,
  projectId: string,
  files: ProjectFiles,
): Promise<void> {
  try {
    const html = buildPreviewSnapshot(files);
    if (!html) return;
    const client = supabase as MinimalSupabaseClient;
    const { error } = await client
      .from("projects")
      .update({ preview_html: html })
      .eq("id", projectId);
    if (error) console.warn("[preview-snapshot] save failed:", error.message);
  } catch (e) {
    console.warn("[preview-snapshot] generation failed:", e);
  }
}
