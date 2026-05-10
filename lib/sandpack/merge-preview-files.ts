import type { ProjectFiles } from "@/lib/types/project";
import { getStarterFiles } from "./starter";

const TAILWIND_CDN_SCRIPT =
  '<script src="https://cdn.tailwindcss.com"></script>';

/** True if HTML already pulls Tailwind (Play CDN, v4 browser build, jsDelivr, etc.). */
function htmlReferencesTailwind(html: string): boolean {
  return /tailwindcss\.com|@tailwindcss\/browser|cdn\.jsdelivr\.net\/npm\/@tailwindcss/i.test(
    html,
  );
}

/**
 * Ensures Tailwind JIT is available for className-based styling in Sandpack.
 * Models sometimes overwrite /index.html and drop the script.
 */
function injectTailwindIntoHtml(html: string): string {
  const trimmed = html.trim();
  if (htmlReferencesTailwind(trimmed)) return trimmed;

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
 * Hidden starter (index.html, index.tsx) merged under project files, then
 * /index.html is repaired if Tailwind CDN was removed.
 */
export function mergeSandpackProjectFiles(files: ProjectFiles): ProjectFiles {
  const starter = getStarterFiles();
  const merged: ProjectFiles = { ...starter, ...files };

  const entry = merged["/index.html"];
  if (entry && typeof entry.code === "string") {
    merged["/index.html"] = {
      ...entry,
      code: injectTailwindIntoHtml(entry.code),
    };
  }

  return merged;
}
