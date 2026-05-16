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

/** Pobiera {slug, id} projektu dla danego sluga — używane przy subdomenach. */
async function lookupProjectBySlug(
  slug: string,
): Promise<{ id: string } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const endpoint = new URL("/rest/v1/projects", url);
  endpoint.searchParams.set("select", "id");
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
    const rows = (await res.json()) as Array<{ id: string }>;
    return rows[0] ? { id: rows[0].id } : null;
  } catch {
    return null;
  }
}

/** Pobiera {slug, id} dla zweryfikowanej custom domain. */
async function lookupByCustomDomain(
  host: string,
): Promise<{ slug: string; id: string } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const endpoint = new URL("/rest/v1/projects", url);
  endpoint.searchParams.set("select", "slug,id");
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
    }>;
    const row = rows[0];
    if (!row?.slug) return null;
    return { slug: row.slug, id: row.id };
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
 * Próbuje serwować plik bezpośrednio z publicznego bucketa `deployed-sites`.
 * Zwraca NextResponse z COOP/COEP lub null (fallback do Sandpacka).
 */
async function serveFromStorage(
  projectId: string,
  pathname: string,
): Promise<NextResponse | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  // "/" → "index.html", "/assets/foo.js" → "assets/foo.js"
  const filePath =
    pathname === "/" || pathname === ""
      ? "index.html"
      : pathname.replace(/^\//, "");

  const storageUrl = `${supabaseUrl}/storage/v1/object/public/deployed-sites/${projectId}/${filePath}`;

  try {
    const res = await fetch(storageUrl, { cache: "no-store" });
    if (!res.ok) return null;

    const body = await res.arrayBuffer();
    const contentType = getContentType(filePath);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        ...SITE_HEADERS,
      },
    });
  } catch {
    return null;
  }
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
    // Cookie cache: zapisuje "{slug}|{projectId}" żeby uniknąć DB lookup na każde żądanie.
    const pidCookie = request.cookies.get("wbn_pid");
    let projectId: string | null = null;
    if (pidCookie?.value) {
      const [cachedSlug, cachedId] = pidCookie.value.split("|");
      if (cachedSlug === publishSlug && cachedId) projectId = cachedId;
    }

    if (!projectId) {
      const proj = await lookupProjectBySlug(publishSlug);
      projectId = proj?.id ?? null;
    }

    // Próba serwowania z Storage (static build dostępny)
    if (projectId) {
      const staticResponse = await serveFromStorage(
        projectId,
        originalPathname,
      );
      if (staticResponse) {
        staticResponse.cookies.set(
          "wbn_pid",
          `${publishSlug}|${projectId}`,
          { maxAge: ROUTE_COOKIE_MAX_AGE, path: "/", httpOnly: true, sameSite: "lax" },
        );
        return staticResponse;
      }
    }

    // Fallback: Sandpack — zachowaj oryginalny sufiks ścieżki
    const sandpackResponse = rewriteToSandpack(url, publishSlug, originalPathname);
    if (projectId) {
      sandpackResponse.cookies.set(
        "wbn_pid",
        `${publishSlug}|${projectId}`,
        { maxAge: ROUTE_COOKIE_MAX_AGE, path: "/", httpOnly: true, sameSite: "lax" },
      );
    }
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

  if (cached?.value) {
    const parts = cached.value.split("|");
    const [cachedHost, cachedSlug, cachedId] = parts;
    if (cachedHost === host && cachedSlug) {
      slug = cachedSlug;
      projectId = cachedId ?? null;
    }
  }

  if (!slug) {
    const proj = await lookupByCustomDomain(host);
    slug = proj?.slug ?? null;
    projectId = proj?.id ?? null;
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

  // Próba serwowania z Storage
  if (projectId) {
    const staticResponse = await serveFromStorage(projectId, originalPathname);
    if (staticResponse) {
      staticResponse.cookies.set(
        ROUTE_COOKIE,
        `${host}|${slug}|${projectId}`,
        { maxAge: ROUTE_COOKIE_MAX_AGE, path: "/", httpOnly: true, sameSite: "lax" },
      );
      return staticResponse;
    }
  }

  // Fallback: Sandpack
  const response = rewriteToSandpack(url, slug, originalPathname);
  response.cookies.set(
    ROUTE_COOKIE,
    `${host}|${slug}|${projectId ?? ""}`,
    { maxAge: ROUTE_COOKIE_MAX_AGE, path: "/", httpOnly: true, sameSite: "lax" },
  );
  return response;
}
