import type { ProjectFiles } from "@/lib/types/project";
import { getStarterFiles } from "./starter";

/**
 * Naprawia `/package.json` wygenerowany przez AI — model czasem zwraca
 * JSON z trailing commas lub komentarzami `//`, ktore sa zgodne z TS/JSON5
 * ale nieprawidlowe w spec JSON. Sandpack i npm crashuja przy parsowaniu.
 *
 * Strategia:
 *  1. Sprobuj JSON.parse — jezeli OK, nic nie rob (zero kosztu).
 *  2. Usun komentarze jednolinijkowe i wielolinijkowe (regex).
 *  3. Usun trailing commas przed `}` / `]` (regex).
 *  4. Sprobuj JSON.parse ponownie — jezeli OK, zapisz naprawiony JSON.
 *  5. Jezeli dalej niepoprawny — pozostaw oryginal (nie psuc bardziej).
 *
 * Uzywa wbudowanych regexow (bez dodatkowych paczek) zeby nie powiekszyc
 * bundla i nie dodawac zaleznoci do server-only kodu.
 */
export function sanitizePackageJson(code: string): string {
  try {
    JSON.parse(code);
    return code; // juz prawidlowy
  } catch {
    // pass
  }

  let fixed = code;

  // 1. Usun komentarze wielolinijkowe /* ... */
  fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, "");

  // 2. Usun komentarze jednolinijkowe // ... (ale nie URL "http://...")
  //    Patrzym na "//" poprzedzone bialym znakiem lub poczatkiem lini
  fixed = fixed.replace(/(?:^|[ \t])\/\/[^\n]*/gm, "");

  // 3. Usun trailing commas: , przed } lub ] (z dowolna iloscia whitespace)
  fixed = fixed.replace(/,(\s*[}\]])/g, "$1");

  try {
    const parsed = JSON.parse(fixed);
    // Formatuj z 2-spacjami zeby byc "schludnym" dla uzytkownika.
    return JSON.stringify(parsed, null, 2);
  } catch {
    // Nie udalo sie naprawic — zwroc oryginal zeby nie pogorszyc sytuacji.
    return code;
  }
}

/**
 * Przetwarza wszystkie pliki projektu i naprawia `/package.json`
 * jezeli zawiera nieprawidlowy JSON (trailing commas, komentarze).
 * Bezpieczne do uzycia przed kazdym zapisem do bazy.
 */
export function sanitizeProjectPackageJson(files: ProjectFiles): ProjectFiles {
  const pkg = files["/package.json"];
  if (!pkg || typeof pkg.code !== "string") return files;

  const fixed = sanitizePackageJson(pkg.code);
  if (fixed === pkg.code) return files; // nic sie nie zmienilo

  return { ...files, "/package.json": { ...pkg, code: fixed } };
}

const TAILWIND_CDN_SCRIPT =
  '<script src="https://cdn.tailwindcss.com"></script>';

/** Projekty Vite (WebContainer) — Tailwind jest bundlowany; CDN psuje COEP. */
export function isViteProjectFiles(files: ProjectFiles): boolean {
  return !!(
    files["/vite.config.ts"] ||
    files["/vite.config.mjs"] ||
    files["/vite.config.mts"]
  );
}

/**
 * Usuwa skrypt Tailwind CDN z HTML (wymagane przy COEP / WebContainer).
 * Wywoluj przy kazdym zapisie /index.html dla projektow Vite.
 */
export function stripTailwindCdnFromIndexHtml(html: string): string {
  let out = html;
  // Pelny tag <script src="...tailwind..."></script>
  out = out.replace(
    /<script[^>]*\bsrc\s*=\s*["'][^"']*(?:cdn\.tailwindcss\.com|@tailwindcss\/browser|cdn\.jsdelivr\.net\/npm\/@tailwindcss)[^"']*["'][^>]*>\s*<\/script>\s*/gi,
    "",
  );
  // Samozamykajacy (rzadki)
  out = out.replace(
    /<script[^>]*\bsrc\s*=\s*["'][^"']*(?:cdn\.tailwindcss\.com|@tailwindcss\/browser|cdn\.jsdelivr\.net\/npm\/@tailwindcss)[^"']*["'][^>]*\/>\s*/gi,
    "",
  );
  return out;
}

/**
 * True only when a real external script tag loads Tailwind (not a comment / string
 * mentioning tailwindcss.com — that used to skip injection and break the preview).
 */
function htmlHasTailwindScript(html: string): boolean {
  return /<script[^>]+\bsrc\s*=\s*["'][^"']*(?:cdn\.tailwindcss\.com|@tailwindcss\/browser|cdn\.jsdelivr\.net\/npm\/@tailwindcss)/i.test(
    html,
  );
}

/** Sandpack serves `public/*` at URL root — `public/index.html` shadows root `/index.html` and strips Tailwind. */
const SHADOW_INDEX_HTML_PATHS = ["/public/index.html", "public/index.html"] as const;

/**
 * Removes paths that break the Sandpack preview. Safe to call before DB persist.
 */
export function stripShadowPublicIndexFromProjectFiles(
  files: ProjectFiles,
): ProjectFiles {
  const out = { ...files };
  for (const p of SHADOW_INDEX_HTML_PATHS) {
    delete out[p];
  }
  return out;
}

/**
 * Ensures Tailwind JIT is available for className-based styling in Sandpack.
 * Models sometimes overwrite /index.html and drop the script.
 */
function injectTailwindIntoHtml(html: string): string {
  const trimmed = html.trim();
  if (htmlHasTailwindScript(trimmed)) return trimmed;

  if (/<\/head>/i.test(trimmed)) {
    return trimmed.replace(
      /<\/head>/i,
      `  ${TAILWIND_CDN_SCRIPT}\n</head>`,
    );
  }

  if (/<head(\s[^>]*)?>/i.test(trimmed)) {
    return trimmed.replace(
      /<head(\s[^>]*)?>/i,
      (open) => `${open}\n  ${TAILWIND_CDN_SCRIPT}`,
    );
  }

  if (/<html[^>]*>/i.test(trimmed)) {
    return trimmed.replace(
      /<html[^>]*>/i,
      (open) => `${open}\n<head>\n  ${TAILWIND_CDN_SCRIPT}\n</head>`,
    );
  }

  return `<!doctype html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${TAILWIND_CDN_SCRIPT}
</head>
<body>
${trimmed}
</body>
</html>`;
}

/**
 * Przy zapisie do bazy:
 *  - Projekty Vite (WebContainer): USUWAJ Tailwind CDN z /index.html — COEP blokuje
 *    zewnetrzny skrypt; style pochodza z @tailwindcss/vite + /src/styles.css.
 *  - Sandpack (brak vite.config): wstrzykuj CDN jesli go brak (stary podglad Sandpack).
 */
export function ensureTailwindInProjectFiles(files: ProjectFiles): ProjectFiles {
  const entry = files["/index.html"];
  if (!entry || typeof entry.code !== "string") return files;

  const code = entry.code;
  if (isViteProjectFiles(files)) {
    const stripped = stripTailwindCdnFromIndexHtml(code);
    if (stripped === code) return files;
    return { ...files, "/index.html": { ...entry, code: stripped } };
  }

  const fixed = injectTailwindIntoHtml(code);
  if (fixed === code) return files;
  return { ...files, "/index.html": { ...entry, code: fixed } };
}

/**
 * Hidden starter (index.html, index.tsx) merged under project files, then
 * /index.html is repaired if Tailwind CDN was removed.
 * Duplicate `public/index.html` is dropped so it cannot override the app shell.
 */
export function mergeSandpackProjectFiles(files: ProjectFiles): ProjectFiles {
  const starter = getStarterFiles();
  const merged = stripShadowPublicIndexFromProjectFiles({
    ...starter,
    ...files,
  });
  return ensureTailwindInProjectFiles(merged);
}
