import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "static",
  "mail",
  "ftp",
]);

function getSubdomain(host: string, rootDomain: string): string | null {
  if (!rootDomain) return null;
  const cleanHost = host.split(":")[0].toLowerCase();
  const cleanRoot = rootDomain.split(":")[0].toLowerCase();

  if (cleanHost === cleanRoot) return null;
  if (!cleanHost.endsWith(`.${cleanRoot}`)) return null;

  const subdomain = cleanHost.slice(0, -1 - cleanRoot.length);
  if (!subdomain || subdomain.includes(".")) return null;
  if (RESERVED_SUBDOMAINS.has(subdomain)) return null;

  return subdomain;
}

function detectSubdomain(host: string): string | null {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
  const publishDomain = process.env.NEXT_PUBLIC_PUBLISH_DOMAIN;

  return (
    getSubdomain(host, rootDomain) ??
    (publishDomain ? getSubdomain(host, publishDomain) : null)
  );
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  const subdomain = detectSubdomain(host);

  if (subdomain) {
    const url = request.nextUrl.clone();
    if (!url.pathname.startsWith(`/sites/${subdomain}`)) {
      url.pathname = `/sites/${subdomain}${url.pathname === "/" ? "" : url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
