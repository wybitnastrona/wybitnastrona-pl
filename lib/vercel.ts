import "server-only";

/**
 * Klient Vercel REST API do zarzadzania custom domains.
 *
 * Wymagana konfiguracja:
 *   VERCEL_TOKEN — token z scope `domains` (https://vercel.com/account/tokens)
 *   VERCEL_PROJECT_ID — ID projektu w Vercel (settings -> general)
 *   VERCEL_TEAM_ID — opcjonalnie, jezeli projekt jest w teamie
 */

const VERCEL_API = "https://api.vercel.com";

function getAuthHeaders(): HeadersInit {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN not configured");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function getQueryString(): string {
  const teamId = process.env.VERCEL_TEAM_ID;
  return teamId ? `?teamId=${teamId}` : "";
}

export type VercelDomainConfig = {
  configuredBy?: "CNAME" | "A" | "http" | null;
  acceptedChallenges?: string[];
  misconfigured: boolean;
};

/**
 * Dodaj custom domene do projektu.
 */
export async function addProjectDomain(
  domain: string,
): Promise<{ ok: boolean; verification?: unknown; error?: string }> {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) return { ok: false, error: "VERCEL_PROJECT_ID not configured" };

  const url = `${VERCEL_API}/v10/projects/${projectId}/domains${getQueryString()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name: domain }),
  });
  const data = (await res.json()) as { error?: { message?: string }; verification?: unknown };
  if (!res.ok) return { ok: false, error: data?.error?.message ?? "Vercel API error" };
  return { ok: true, verification: data.verification };
}

/**
 * Usun custom domene z projektu.
 */
export async function removeProjectDomain(
  domain: string,
): Promise<{ ok: boolean; error?: string }> {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) return { ok: false, error: "VERCEL_PROJECT_ID not configured" };

  const url = `${VERCEL_API}/v9/projects/${projectId}/domains/${domain}${getQueryString()}`;
  const res = await fetch(url, { method: "DELETE", headers: getAuthHeaders() });
  if (!res.ok) {
    const data = (await res.json()) as { error?: { message?: string } };
    return { ok: false, error: data?.error?.message };
  }
  return { ok: true };
}

/**
 * Pobierz konfiguracje DNS dla domeny.
 */
export async function getDomainConfig(
  domain: string,
): Promise<VercelDomainConfig | null> {
  const url = `${VERCEL_API}/v6/domains/${domain}/config${getQueryString()}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) return null;
  return (await res.json()) as VercelDomainConfig;
}

/**
 * Zweryfikuj domene (wymaga, zeby DNS byl ustawiony).
 */
export async function verifyDomain(
  domain: string,
): Promise<{ verified: boolean }> {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) return { verified: false };
  const url = `${VERCEL_API}/v9/projects/${projectId}/domains/${domain}/verify${getQueryString()}`;
  const res = await fetch(url, { method: "POST", headers: getAuthHeaders() });
  return { verified: res.ok };
}

/**
 * Sprawdz cene i dostepnosc rejestracji domeny.
 * https://vercel.com/docs/rest-api/reference/endpoints/domains/check-the-price-for-a-domain
 */
export type DomainPriceResult = {
  available: boolean;
  price?: number;
  period?: number;
  currency?: string;
  error?: string;
};

export async function getDomainPrice(
  domain: string,
): Promise<DomainPriceResult> {
  const teamSuffix = getQueryString();
  const sep = teamSuffix ? "&" : "?";
  const url = `${VERCEL_API}/v4/domains/price${teamSuffix}${sep}name=${encodeURIComponent(domain)}&type=new`;
  const res = await fetch(url, { headers: getAuthHeaders() });

  if (res.status === 400) {
    // Vercel zwraca 400 dla niedostepnej / juz zarejestrowanej domeny.
    return { available: false };
  }
  const data = (await res.json()) as {
    price?: number;
    period?: number;
    error?: { message?: string };
  };
  if (!res.ok) {
    return { available: false, error: data?.error?.message ?? "Vercel API error" };
  }
  return {
    available: true,
    price: data.price,
    period: data.period,
    currency: "USD",
  };
}

/**
 * Sprawdz status dostepnosci domeny.
 * https://vercel.com/docs/rest-api/reference/endpoints/domains/check-a-domain-availability
 */
export async function checkDomainAvailability(
  domain: string,
): Promise<{ available: boolean; error?: string }> {
  const teamSuffix = getQueryString();
  const sep = teamSuffix ? "&" : "?";
  const url = `${VERCEL_API}/v4/domains/status${teamSuffix}${sep}name=${encodeURIComponent(domain)}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  const data = (await res.json()) as { available?: boolean; error?: { message?: string } };
  if (!res.ok) return { available: false, error: data?.error?.message };
  return { available: !!data.available };
}

/**
 * Kup domene przez Vercel (Vercel jest registrarem).
 * https://vercel.com/docs/rest-api/reference/endpoints/domains/purchase-a-domain
 */
export async function purchaseDomain(
  domain: string,
  expectedPrice?: number,
): Promise<{ ok: boolean; error?: string; domain?: { name: string; expiresAt?: number } }> {
  const url = `${VERCEL_API}/v5/domains/buy${getQueryString()}`;
  const body: Record<string, unknown> = { name: domain, renew: true };
  if (typeof expectedPrice === "number") body.expectedPrice = expectedPrice;
  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as {
    domain?: { name: string; expiresAt?: number };
    error?: { message?: string; code?: string };
  };
  if (!res.ok) {
    return { ok: false, error: data?.error?.message ?? "Vercel purchase failed" };
  }
  return { ok: true, domain: data.domain };
}
