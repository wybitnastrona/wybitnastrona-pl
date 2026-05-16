import { NextResponse, type NextRequest } from "next/server";

/**
 * Routing subdomen publikacji oraz domen własnych (custom_domain w `projects`).
 *
 * Kolejność obsługi dla każdego żądania:
 *  1. publishSlug (np. slug.wybitny.website):
 *     a. Próba serwowania z Supabase Storage `deployed-sites/{projectId}/{path}`.
 *     b. Fallback: rewrite do /sites/{slug}{suffix} (Sandpack).
 *  2. Internal host (wybitnastrona.pl, localhost, *.vercel.app):
 *     COOP/COEP dla /project/*, pass-through dla reszty.
 *  3. Custom domain (weryfikowana przez DNS):
 *     Jak wyżej (Storage-first → Sandpack fallback) z cacheowaniem slugu/ID w cookie.
 *
 * COOP/COEP wymagane przez WebContainer (SharedArrayBuffer + crossOriginIsolated)
 * i ustawiane na odpowiedziach z subdomen projektów.
 *
 * Matcher: nie wyklucza rozszerzeń plików — potrzebne do serwowania
 * /assets/xxx.js, /assets/xxx.css z buildu Vite przez proxy.
 */

export const config = {
  matcher: [
    // Łapie WSZYSTKIE ścieżki z wyjątkiem zasobów Next.js i tras API.
    // Celowo nie wyklucza rozszerzeń plików (.js, .css, …) bo subdomena
    // projektu musi serwować te zasoby z Supabase Storage.
    "/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)",
  ],
};

const ROUTE_COOKIE = "wbn_route";
const ROUTE_COOKIE_MAX_AGE = 60 * 5;

const SITE_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Resource-Policy": "cross-origin",
} as const;

function getRootDomains(): string[] {
  const explicit = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "").trim();
  const publish = (process.env.NEXT_PUBLIC_PUBLISH_DOMAIN ?? "").trim();
  // wybitny.website jest hardkodowany jako fallback żeby {slug}.wybitny.website
  // działało zawsze bez konieczności ustawiania NEXT_PUBLIC_PUBLISH_DOMAIN.
  const list = [
    explicit,
    publish,
    "wybitnastrona.pl",
    "wybitny.website",
    "localhost",
  ]
    .filter(Boolean)
    .map((d) => d.toLowerCase());
  return Array.from(new Set(list));
}

function isInternalHost(host: string, roots: string[]): boolean {
  const lower = host.toLowerCase();
  if (lower.startsWith("localhost") || lower.startsWith("127.")) return true;
  if (lower.endsWith(".vercel.app")) return true;
  return roots.some((root) => lower === root || lower.endsWith(`.${root}`));
}

function extractPublishSlug(host: string, roots: string[]): string | null {
  const lower = host.toLowerCase().split(":")[0];
  for (const root of roots) {
    if (lower.endsWith(`.${root}`)) {
      const sub = lower.slice(0, -1 - root.length);
      if (sub && sub !== "www") return sub;
    }
  }
  return null;
}

/**
 * Pobiera {id, isStaticDeployed} projektu dla danego sluga — używane przy subdomenach.
 * `isStaticDeployed` decyduje czy odcinamy Sandpack całkowicie (static build istnieje
 * → 404 dla brakujących plików zamiast fallbacku do bundlera).
 */
async function lookupProjectBySlug(
  slug: string,
): Promise<{ id: string; isStaticDeployed: boolean } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const endpoint = new URL("/rest/v1/projects", url);
  endpoint.searchParams.set("select", "id,static_deployed_at");
  endpoint.searchParams.set("slug", `eq.${slug}`);
  endpoint.searchParams.set("is_public", "eq.true");
  endpoint.searchParams.set("limit", "1");

  try {
    const res = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      id: string;
      static_deployed_at: string | null;
    }>;
    const row = rows[0];
    if (!row) return null;
    return { id: row.id, isStaticDeployed: !!row.static_deployed_at };
  } catch {
    return null;
  }
}

/** Pobiera {slug, id, isStaticDeployed} dla zweryfikowanej custom domain. */
async function lookupByCustomDomain(
  host: string,
): Promise<{ slug: string; id: string; isStaticDeployed: boolean } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const endpoint = new URL("/rest/v1/projects", url);
  endpoint.searchParams.set("select", "slug,id,static_deployed_at");
  endpoint.searchParams.set("custom_domain", `eq.${host}`);
  endpoint.searchParams.set("custom_domain_verified_at", "not.is.null");
  endpoint.searchParams.set("is_public", "eq.true");
  endpoint.searchParams.set("limit", "1");

  try {
    const res = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      slug: string | null;
      id: string;
      static_deployed_at: string | null;
    }>;
    const row = rows[0];
    if (!row?.slug) return null;
    return {
      slug: row.slug,
      id: row.id,
      isStaticDeployed: !!row.static_deployed_at,
    };
  } catch {
    return null;
  }
}

function getContentType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
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
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    txt: "text/plain; charset=utf-8",
    xml: "application/xml",
    map: "application/json",
  };
  return map[ext] ?? "application/octet-stream";
}

/**
 * Wyciąga rozszerzenie pliku z pathname. Zwraca pusty string gdy nie ma
 * kropki w ostatnim segmencie (czyli ścieżka wygląda jak SPA route).
 */
function getExt(pathname: string): string {
  const last = pathname.split("/").pop() ?? "";
  const dot = last.lastIndexOf(".");
  if (dot < 0) return "";
  return last.slice(dot + 1).toLowerCase();
}

/**
 * Próbuje serwować plik bezpośrednio z publicznego bucketa `deployed-sites`.
 *
 * Zachowanie:
 *  - "/" lub "" → próbuje "index.html".
 *  - "/assets/foo.js" → "assets/foo.js" (zwraca null gdy 404 — caller decyduje co dalej).
 *  - "/legal/privacy" (bez rozszerzenia) → SPA fallback do "index.html"
 *    żeby React Router / Next App Router obsłużył routing po stronie klienta.
 *
 * Zwraca NextResponse z COOP/COEP lub null (np. dla brakujących assetów `.js`).
 */
async function serveFromStorage(
  projectId: string,
  pathname: string,
): Promise<NextResponse | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const isRoot = pathname === "/" || pathname === "";
  const filePath = isRoot ? "index.html" : pathname.replace(/^\//, "");
  const ext = getExt(filePath);
  const looksLikeRoute = !isRoot && ext === "";

  async function fetchFile(p: string): Promise<NextResponse | null> {
    const storageUrl = `${supabaseUrl}/storage/v1/object/public/deployed-sites/${projectId}/${p}`;
    try {
      const res = await fetch(storageUrl, { cache: "no-store" });
      if (!res.ok) return null;
      const body = await res.arrayBuffer();
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": getContentType(p),
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
          ...SITE_HEADERS,
        },
      });
    } catch {
      return null;
    }
  }

  // 1. Direct hit
  const direct = await fetchFile(filePath);
  if (direct) return direct;

  // 2. SPA fallback — tylko dla ścieżek wyglądających na route (bez rozszerzenia)
  if (looksLikeRoute) {
    const spa = await fetchFile("index.html");
    if (spa) return spa;
  }

  return null;
}

/**
 * Czyściutka odpowiedź 404 dla statycznie opublikowanych projektów.
 * Używana zamiast fallbacku do Sandpacka gdy plik nie istnieje w buckecie
 * (np. /manifest.json, /apple-icon, /favicon.ico które nie zostały zbudowane).
 */
function staticNotFound(): NextResponse {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>404</title>` +
      `<style>body{font-family:system-ui;background:#0a0a09;color:#e7e3da;` +
      `display:flex;min-height:100vh;align-items:center;justify-content:center;` +
      `margin:0;padding:24px;text-align:center}h1{font-size:42px;margin:0 0 8px}` +
      `p{opacity:.6;margin:4px 0}</style>` +
      `<div><h1>404</h1><p>Strona nie znaleziona.</p></div>`,
    {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...SITE_HEADERS,
      },
    },
  );
}

/**
 * Rewrite do Sandpacka z zachowaniem oryginalnego sufiksu ścieżki.
 * Naprawia błąd gdy rewrite usuwał /assets/... i inne sufiksy URL.
 */
function rewriteToSandpack(
  url: URL,
  slug: string,
  originalPathname: string,
): NextResponse {
  const suffix = originalPathname === "/" ? "" : originalPathname;
  url.pathname = `/sites/${slug}${suffix}`;
  const response = NextResponse.rewrite(url);
  Object.entries(SITE_HEADERS).forEach(([k, v]) =>
    response.headers.set(k, v),
  );
  return response;
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const rawHost = (request.headers.get("host") ?? "").toLowerCase();
  if (!rawHost) return NextResponse.next();

  const host = rawHost.split(":")[0];
  const roots = getRootDomains();
  const originalPathname = url.pathname;

  // ── 1. Subdomeny publikacji (slug.wybitny.website) ────────────────────────
  const publishSlug = extractPublishSlug(host, roots);
  if (publishSlug) {
    // Cookie cache: zapisuje "{slug}|{projectId}|{static?'1':'0'}" — unika DB lookup
    // i pozwala middleware'owi wiedzieć od razu czy static build jest dostępny.
    const pidCookie = request.cookies.get("wbn_pid");
    let projectId: string | null = null;
    let isStaticDeployed = false;
    if (pidCookie?.value) {
      const [cachedSlug, cachedId, cachedStatic] = pidCookie.value.split("|");
      if (cachedSlug === publishSlug && cachedId) {
        projectId = cachedId;
        isStaticDeployed = cachedStatic === "1";
      }
    }

    if (!projectId) {
      const proj = await lookupProjectBySlug(publishSlug);
      projectId = proj?.id ?? null;
      isStaticDeployed = !!proj?.isStaticDeployed;
    }

    const cookieValue = projectId
      ? `${publishSlug}|${projectId}|${isStaticDeployed ? "1" : "0"}`
      : null;
    function setPidCookie(res: NextResponse) {
      if (cookieValue) {
        res.cookies.set("wbn_pid", cookieValue, {
          maxAge: ROUTE_COOKIE_MAX_AGE,
          path: "/",
          httpOnly: true,
          sameSite: "lax",
        });
      }
    }

    // Próba serwowania z Storage (static build dostępny)
    if (projectId) {
      const staticResponse = await serveFromStorage(projectId, originalPathname);
      if (staticResponse) {
        setPidCookie(staticResponse);
        return staticResponse;
      }
      // Static build istnieje, ale plik nie znaleziony → 404 (NIGDY Sandpack).
      // To eliminuje błędy 'Unsafe attempt to load URL sandpack-bundler' dla
      // brakujących /manifest.json, /apple-icon, /_rsc itp.
      if (isStaticDeployed) {
        const notFound = staticNotFound();
        setPidCookie(notFound);
        return notFound;
      }
    }

    // Brak static build → fallback do Sandpacka (preview deweloperski)
    const sandpackResponse = rewriteToSandpack(url, publishSlug, originalPathname);
    setPidCookie(sandpackResponse);
    return sandpackResponse;
  }

  // ── 2. Wewnętrzne hosty (wybitnastrona.pl, localhost, *.vercel.app) ───────
  if (isInternalHost(host, roots)) {
    const res = NextResponse.next();
    if (url.pathname.startsWith("/project/")) {
      res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
      res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
      res.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    }
    return res;
  }

  // ── 3. Custom domeny ───────────────────────────────────────────────────────
  const cached = request.cookies.get(ROUTE_COOKIE);
  let slug: string | null = null;
  let projectId: string | null = null;
  let isStaticDeployed = false;

  if (cached?.value) {
    const parts = cached.value.split("|");
    const [cachedHost, cachedSlug, cachedId, cachedStatic] = parts;
    if (cachedHost === host && cachedSlug) {
      slug = cachedSlug;
      projectId = cachedId ?? null;
      isStaticDeployed = cachedStatic === "1";
    }
  }

  if (!slug) {
    const proj = await lookupByCustomDomain(host);
    slug = proj?.slug ?? null;
    projectId = proj?.id ?? null;
    isStaticDeployed = !!proj?.isStaticDeployed;
  }

  if (!slug) {
    const res = new NextResponse(
      `<!doctype html><meta charset="utf-8"><title>Nie znaleziono</title>` +
        `<style>body{font-family:system-ui;background:#0a0a09;color:#e7e3da;` +
        `display:flex;min-height:100vh;align-items:center;justify-content:center;` +
        `margin:0;padding:24px;text-align:center}h1{font-size:28px;margin:0 0 8px}` +
        `p{opacity:.7;margin:4px 0}a{color:#d4c5a3}</style>` +
        `<div><h1>Domena niezarejestrowana</h1>` +
        `<p>${host} nie jest zmapowana na żaden projekt w wybitnastrona.pl.</p>` +
        `<p><a href="https://wybitnastrona.pl">wybitnastrona.pl</a></p></div>`,
      {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
    res.cookies.set(ROUTE_COOKIE, "", { maxAge: 0, path: "/" });
    return res;
  }

  const cookieValue = `${host}|${slug}|${projectId ?? ""}|${isStaticDeployed ? "1" : "0"}`;
  function setRouteCookie(res: NextResponse) {
    res.cookies.set(ROUTE_COOKIE, cookieValue, {
      maxAge: ROUTE_COOKIE_MAX_AGE,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }

  // Próba serwowania z Storage
  if (projectId) {
    const staticResponse = await serveFromStorage(projectId, originalPathname);
    if (staticResponse) {
      setRouteCookie(staticResponse);
      return staticResponse;
    }
    // Static build istnieje → 404 zamiast Sandpacka
    if (isStaticDeployed) {
      const notFound = staticNotFound();
      setRouteCookie(notFound);
      return notFound;
    }
  }

  // Brak static build → fallback do Sandpacka
  const response = rewriteToSandpack(url, slug, originalPathname);
  setRouteCookie(response);
  return response;
}
