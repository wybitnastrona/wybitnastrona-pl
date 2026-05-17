/**
 * Wybiera domene publikacji dla opublikowanych stron.
 * Priorytet (item 96 audytu - poprawione fallbacki):
 * 1) NEXT_PUBLIC_PUBLISH_DOMAIN (np. wybitny.website) - explicit konfig,
 * 2) NEXT_PUBLIC_ROOT_DOMAIN (np. wybitnastrona.pl) - fallback,
 * 3) VERCEL_URL - automatyczny URL projektu Vercel (preview deployments),
 * 4) "localhost:3000" - tylko jako last-resort w dev / SSR przed env init.
 */
export function getPublishDomain(): string {
  const explicit =
    process.env.NEXT_PUBLIC_PUBLISH_DOMAIN ??
    process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  if (explicit) return explicit;

  // Na Vercelu (preview/production) zawsze mamy VERCEL_URL.
  if (process.env.VERCEL_URL) return process.env.VERCEL_URL;

  return "localhost:3000";
}

/**
 * Zwraca pełny app URL (z protokołem) - używany przez Stripe Checkout,
 * email link generation, screenshot route.
 *
 * Priorytet:
 * 1) NEXT_PUBLIC_APP_URL (jawnie ustawione) - https://wybitnastrona.pl
 * 2) VERCEL_URL (auto) - https://wybitnastrona-pl.vercel.app
 * 3) http://localhost:3000 (dev)
 */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function buildPublishUrl(slug: string, domain?: string): string {
  const host = domain ?? getPublishDomain();
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${slug}.${host}`;
}
