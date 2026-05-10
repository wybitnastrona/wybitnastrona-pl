/**
 * Klient analytics — fire-and-forget POST do /api/projects/:id/events.
 * Uzywany w komponentach client-side i SSR pages.
 */

export type AnalyticsEventType =
  | "view"
  | "prompt"
  | "publish"
  | "remix"
  | "edit"
  | "export"
  | "error";

export function trackEvent(
  projectId: string,
  type: AnalyticsEventType,
  metadata?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  // Uzywamy sendBeacon gdzie to mozliwe — przezywa unloads strony.
  const payload = JSON.stringify({ type, metadata });
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(`/api/projects/${projectId}/events`, blob);
      return;
    }
  } catch {
    /* fallthrough */
  }
  fetch(`/api/projects/${projectId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
