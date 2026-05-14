/**
 * Nawigacja pełnym przeładowaniem dokumentu do `/project/*`.
 *
 * Next.js `router.push` / `<Link>` robi SPA — pierwszy dokument (np. `/`)
 * nie dostaje nagłówków COOP/COEP z middleware, więc `crossOriginIsolated`
 * pozostaje `false` i WebContainer rzuca:
 * "SharedArrayBuffer transfer requires self.crossOriginIsolated".
 */
export function navigateToProjectHref(href: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(href);
}
