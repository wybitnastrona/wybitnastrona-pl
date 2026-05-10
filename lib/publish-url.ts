/**
 * Wybiera domene publikacji dla opublikowanych stron.
 * Priorytet:
 * 1) NEXT_PUBLIC_PUBLISH_DOMAIN (np. wybitny.website) - jezeli ustawiona,
 * 2) NEXT_PUBLIC_ROOT_DOMAIN (np. wybitnastrona.pl) - fallback,
 * 3) "localhost:3000" - dev fallback.
 */
export function getPublishDomain(): string {
  return (
    process.env.NEXT_PUBLIC_PUBLISH_DOMAIN ??
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ??
    "localhost:3000"
  );
}

export function buildPublishUrl(slug: string, domain?: string): string {
  const host = domain ?? getPublishDomain();
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${slug}.${host}`;
}
