/**
 * Łączy startowy szkielet Vite/React z plikami z bazy projektu.
 *
 * Reguły:
 *  - jeśli baza nie ma `package.json` — bierzemy go ze startera,
 *  - jeśli baza nie ma `index.html` — bierzemy hostowy `index.html`
 *    (zawiera Tailwind CDN + skrypty picker/error),
 *  - jeśli baza wgrywa stary, „płaski” układ Sandpacka (`/App.tsx`,
 *    `/index.tsx`), próbujemy go odwzorować na `/src/App.tsx` i
 *    `/src/main.tsx`, żeby Vite go zobaczył.
 *  - usuwamy `public/index.html` (Vite go nie używa do bootstrapu).
 */

import type { ProjectFiles } from "@/lib/types/project";
import { getViteReactStarterFiles } from "./vite-react-starter";

const SHADOW_INDEX_HTML_PATHS = [
  "/public/index.html",
  "public/index.html",
] as const;

function stripShadows(files: ProjectFiles): ProjectFiles {
  const out = { ...files };
  for (const p of SHADOW_INDEX_HTML_PATHS) delete out[p];
  return out;
}

/**
 * Stary układ Sandpacka miał `/App.tsx` i `/index.tsx` w roocie.
 * Vite oczekuje plików w `/src/`. Tłumaczymy je tylko, gdy w `files`
 * nie ma jeszcze odpowiednika w `/src/`.
 */
function migrateLegacyPaths(files: ProjectFiles): ProjectFiles {
  const out: ProjectFiles = { ...files };

  const legacyMappings: Array<[string, string]> = [
    ["/App.tsx", "/src/App.tsx"],
    ["/index.tsx", "/src/main.tsx"],
    ["/App.jsx", "/src/App.jsx"],
    ["/index.jsx", "/src/main.jsx"],
  ];

  for (const [legacy, target] of legacyMappings) {
    const legacyFile = out[legacy];
    if (!legacyFile) continue;
    if (!out[target]) {
      out[target] = { ...legacyFile };
    }
    delete out[legacy];
  }
  return out;
}

export function mergeWebContainerReactFiles(
  files: ProjectFiles,
): ProjectFiles {
  const starter = getViteReactStarterFiles();
  const migrated = migrateLegacyPaths(stripShadows(files));

  return {
    ...starter,
    ...migrated,
  };
}
