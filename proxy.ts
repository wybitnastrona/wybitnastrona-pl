import { NextResponse, type NextRequest } from "next/server";

/**
 * Custom-domain routing for published projects.
 *
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` (same lifecycle, same API,
 * just a clearer name). See node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.
 *
 * Flow:
 *  1) Klient odwiedza wlasna domene (np. mojadomena.pl), DNS prowadzi na Vercel.
 *  2) Proxy odczytuje naglowek host.
 *  3) Jezeli host != ROOT_DOMAIN i nie jest publish-subdomena -> sprawdzamy
 *     w Supabase czy istnieje projekt z taka custom_domain (zweryfikowana).
 *     Wynik cache'ujemy w cookie ("wbn_route") na 5 min, zeby nie hammer-ovac DB.
 *  4) Jezeli tak -> rewrite do /sites/[slug]/<original path>.
 *  5) Subdomena <slug>.publish-domain (np. <slug>.wybitnastrona.pl albo
 *     <slug>.wybitny.website) ma nadal byc obslugiwana — rewrite do /sites/[slug].
 *
 * UWAGA: w runtimie Edge nie mamy ciastek Supabase auth (ten kod biegnie przed
 * wszystkimi handlerami). Uzywamy public anon-key + REST z naglowkiem apikey;
 * sprawdzamy tylko zweryfikowane domeny + opublikowane projekty.
 */

export const config = {
  matcher: [
    // Pomijamy: API, statyczne pliki Next, sciezki publish (/sites/*),
    // legacy (/p/*), oraz favicon/sitemap. Reszta przechodzi przez proxy.
    "/((?!api|_next/static|_next/image|sites|p/|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};

const ROUTE_COOKIE = "wbn_route";
const ROUTE_COOKIE_MAX_AGE = 60 * 5; // 5 min

function getRootDomains(): string[] {
  const explicit = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "").trim();
  const publish = (process.env.NEXT_PUBLIC_PUBLISH_DOMAIN ?? "").trim();
  const list = [explicit, publish, "wybitnastrona.pl", "localhost"]
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
      // pomijamy wildcard typu "www.<root>"
      if (sub && sub !== "www") return sub;
    }
  }
  return null;
}

async function lookupSlugByCustomDomain(host: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const endpoint = new URL("/rest/v1/projects", url);
  endpoint.searchParams.set("select", "slug");
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
      // Edge runtime: avoid Next caching this — the route map can change anytime.
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ slug: string | null }>;
    return rows[0]?.slug ?? null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const rawHost = (request.headers.get("host") ?? "").toLowerCase();
  if (!rawHost) return NextResponse.next();

  const host = rawHost.split(":")[0];
  const roots = getRootDomains();

  // 1) <slug>.<publish-domain> — zwykla publikacja przez subdomene.
  // /sites/[subdomain] renderuje cala strone w Sandpack (SPA), wiec ignorujemy
  // dalsze segmenty sciezki — i tak obsluguje je iframe.
  const publishSlug = extractPublishSlug(host, roots);
  if (publishSlug) {
    if (!url.pathname.startsWith("/sites/")) {
      url.pathname = `/sites/${publishSlug}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // 2) Host nalezy do nas — dziala normalna aplikacja (landing, /dashboard, ...).
  if (isInternalHost(host, roots)) {
    return NextResponse.next();
  }

  // 3) Custom domain — sprawdzamy mapping. Najpierw cookie cache.
  const cached = request.cookies.get(ROUTE_COOKIE);
  let slug: string | null = null;
  if (cached?.value) {
    const [cachedHost, cachedSlug] = cached.value.split("|");
    if (cachedHost === host && cachedSlug) slug = cachedSlug;
  }
  if (!slug) {
    slug = await lookupSlugByCustomDomain(host);
  }

  if (!slug) {
    // Brak zmapowanego projektu — zwracamy plain 404 (czyscimy stary cache).
    const res = new NextResponse(
      `<!doctype html><meta charset="utf-8"><title>Nie znaleziono</title>` +
        `<style>body{font-family:system-ui;background:#0a0a09;color:#e7e3da;` +
        `display:flex;min-height:100vh;align-items:center;justify-content:center;` +
        `margin:0;padding:24px;text-align:center}h1{font-size:28px;margin:0 0 8px}` +
        `p{opacity:.7;margin:4px 0}a{color:#d4c5a3}</style>` +
        `<div><h1>Domena niezarejestrowana</h1>` +
        `<p>${host} nie jest zmapowana na zaden projekt w wybitnastrona.pl.</p>` +
        `<p><a href="https://wybitnastrona.pl">wybitnastrona.pl</a></p></div>`,
      {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
    res.cookies.set(ROUTE_COOKIE, "", { maxAge: 0, path: "/" });
    return res;
  }

  // 4) Rewrite na /sites/[slug]. (Inner-path routing obsluguje renderowany iframe.)
  url.pathname = `/sites/${slug}`;
  const response = NextResponse.rewrite(url);
  response.cookies.set(ROUTE_COOKIE, `${host}|${slug}`, {
    maxAge: ROUTE_COOKIE_MAX_AGE,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  return response;
}
