import { NextResponse, type NextRequest } from "next/server";

/**
 * Routing subdomen publikacji oraz domen własnych (custom_domain w `projects`).
 * Rewrite do `/sites/[slug]` — ten sam przepływ co wcześniej w `proxy.ts` (Next 16).
 *
 * Edge: brak sesji Supabase — lookup przez REST + anon key (tylko zweryfikowane,
 * publiczne projekty).
 */

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|sites|p/|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};

const ROUTE_COOKIE = "wbn_route";
const ROUTE_COOKIE_MAX_AGE = 60 * 5;

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
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ slug: string | null }>;
    return rows[0]?.slug ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const rawHost = (request.headers.get("host") ?? "").toLowerCase();
  if (!rawHost) return NextResponse.next();

  const host = rawHost.split(":")[0];
  const roots = getRootDomains();

  const publishSlug = extractPublishSlug(host, roots);
  if (publishSlug) {
    if (!url.pathname.startsWith("/sites/")) {
      url.pathname = `/sites/${publishSlug}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (isInternalHost(host, roots)) {
    const res = NextResponse.next();
    if (url.pathname.startsWith("/project/")) {
      res.headers.set("Cross-Origin-Embedder-Policy", "credentialless");
      res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    }
    return res;
  }

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
