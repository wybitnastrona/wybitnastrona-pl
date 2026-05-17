/**
 * Helpery współdzielone przez pipeline statycznego deployu:
 *  - /api/projects/[id]/deploy-static/prepare (generuje signed upload URLs)
 *  - /api/projects/[id]/deploy-static/finalize (weryfikacja + flag)
 *  - /api/projects/[id]/deploy-static (DELETE — cofa publikację)
 *
 * Klient (components/webcontainer/wc-runtime.tsx) używa `getContentType`
 * przy raw PUT do signed URL żeby Storage zapisał poprawny MIME.
 */

const CONTENT_TYPE_MAP: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  mjs: "application/javascript; charset=utf-8",
  cjs: "application/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
  txt: "text/plain; charset=utf-8",
  xml: "application/xml",
  map: "application/json",
  webmanifest: "application/manifest+json",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
};

export function getContentType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPE_MAP[ext] ?? "application/octet-stream";
}

/**
 * Lista dozwolonych rozszerzeń plików w buckecie `deployed-sites`.
 * Bucket ma własny allowedMimeTypes na poziomie Supabase, ale to dodatkowy
 * guard po stronie serwera żeby signed URL nie pozwolił wgrać .exe itp.
 */
const ALLOWED_EXTS = new Set(Object.keys(CONTENT_TYPE_MAP));

export function isAllowedFile(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXTS.has(ext);
}

/**
 * Sanityzacja ścieżki - odrzucamy traversale, leading/trailing slash
 * normalizujemy do prostej formy "assets/main.js".
 */
export function normalizeDeployPath(input: string): string | null {
  let p = input.trim();
  if (!p) return null;
  if (p.startsWith("/")) p = p.slice(1);
  if (p.endsWith("/")) p = p.slice(0, -1);
  if (!p) return null;
  if (p.includes("..")) return null;
  if (p.includes("\\")) return null;
  return p;
}

/**
 * Rekurencyjnie usuwa wszystkie pliki z `deployed-sites/{projectId}/`.
 * Używane przy orphan cleanup (przed nowym deployem) i przy unpublish.
 * Failuje miękko - tylko loguje warning.
 */
export async function deleteStoragePrefix(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storage: any,
  projectId: string,
): Promise<void> {
  const { data: topLevel } = await storage
    .from("deployed-sites")
    .list(projectId);

  if (!topLevel?.length) return;

  const paths: string[] = [];
  for (const item of topLevel as Array<{ name: string; id: string | null }>) {
    if (item.id) {
      paths.push(`${projectId}/${item.name}`);
    } else {
      const { data: sub } = await storage
        .from("deployed-sites")
        .list(`${projectId}/${item.name}`);
      if (sub?.length) {
        for (const subItem of sub as Array<{
          name: string;
          id: string | null;
        }>) {
          if (subItem.id) {
            paths.push(`${projectId}/${item.name}/${subItem.name}`);
          } else {
            // 3. poziom (np. assets/icons/...) - kolejny list
            const { data: deep } = await storage
              .from("deployed-sites")
              .list(`${projectId}/${item.name}/${subItem.name}`);
            if (deep?.length) {
              for (const d of deep as Array<{
                name: string;
                id: string | null;
              }>) {
                if (d.id) {
                  paths.push(
                    `${projectId}/${item.name}/${subItem.name}/${d.name}`,
                  );
                }
              }
            }
          }
        }
      }
    }
  }

  if (paths.length) {
    await storage.from("deployed-sites").remove(paths);
  }
}
