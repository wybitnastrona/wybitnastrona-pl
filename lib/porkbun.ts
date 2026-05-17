/**
 * Porkbun API client (rejestracja domen).
 *
 * Cennik: GET https://api.porkbun.com/api/json/v3/pricing/get — bez kluczy.
 * Dostepnosc: POST .../domain/checkDomain/{domain} — wymaga klucza.
 * Rejestracja: POST .../domain/order/{domain} — wymaga klucza + srodkow.
 *
 * Klucze sa opcjonalne — gdy nie sa skonfigurowane, funkcje zwracaja
 * `not_configured` zamiast crashowac route. UI moze wtedy pokazac
 * komunikat "skonfiguruj Porkbun" zamiast podpowiedzi cenowej.
 *
 * Marza wybitnastrona.pl: 5 USD od kazdej zakupionej domeny — doliczane
 * po stronie aplikacji (server-side), nie wysylane do Porkbun.
 */

const PORKBUN_BASE = "https://api.porkbun.com/api/json/v3";

/** Marza wybitnastrona.pl od kazdej domeny (USD). */
export const DOMAIN_COMMISSION_USD = 5;

type PorkbunPricingResponse = {
  status: "SUCCESS" | "ERROR";
  pricing: Record<
    string,
    {
      registration?: string;
      renewal?: string;
      transfer?: string;
    }
  >;
  message?: string;
};

type PorkbunAvailabilityResponse = {
  status: "SUCCESS" | "ERROR";
  response?: {
    avail: "yes" | "no";
    type: string;
    price?: string;
    regular_price?: string;
    additional?: Record<string, unknown>;
  };
  message?: string;
};

function getCreds(): { apikey: string; secretapikey: string } | null {
  const apikey = process.env.PORKBUN_API_KEY;
  const secretapikey = process.env.PORKBUN_SECRET_KEY;
  if (!apikey || !secretapikey || apikey === "REPLACE_ME") return null;
  return { apikey, secretapikey };
}

function extractTld(domain: string): string {
  // ostatni segment po kropce, lower-case
  const parts = domain.toLowerCase().split(".");
  if (parts.length < 2) return "";
  return parts.slice(-1)[0];
}

/**
 * Pricing dla TLD (np. `pl`, `com`). Nie wymaga kluczy.
 * Zwraca cene w USD jako number, lub null jezeli nieznana.
 */
export async function getPorkbunTldPrice(
  tld: string,
): Promise<number | null> {
  try {
    const res = await fetch(`${PORKBUN_BASE}/pricing/get`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PorkbunPricingResponse;
    if (data.status !== "SUCCESS") return null;
    const entry = data.pricing[tld.toLowerCase()];
    if (!entry?.registration) return null;
    const num = Number(entry.registration);
    return Number.isFinite(num) ? num : null;
  } catch {
    return null;
  }
}

/**
 * Sprawdza dostepnosc konkretnej domeny + zwraca cene (najczesciej oferowana,
 * np. pierwsza promo + regular). Wymaga kluczy API.
 */
export async function checkPorkbunAvailability(domain: string): Promise<
  | {
      ok: true;
      available: boolean;
      price: number | null;
      regularPrice: number | null;
    }
  | { ok: false; error: string }
> {
  const creds = getCreds();
  if (!creds) return { ok: false, error: "not_configured" };

  try {
    const res = await fetch(
      `${PORKBUN_BASE}/domain/checkDomain/${encodeURIComponent(domain)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
        cache: "no-store",
      },
    );
    if (!res.ok) return { ok: false, error: `Porkbun HTTP ${res.status}` };
    const data = (await res.json()) as PorkbunAvailabilityResponse;
    if (data.status !== "SUCCESS") {
      return { ok: false, error: data.message ?? "Porkbun error" };
    }
    const resp = data.response;
    return {
      ok: true,
      available: resp?.avail === "yes",
      price: resp?.price ? Number(resp.price) : null,
      regularPrice: resp?.regular_price ? Number(resp.regular_price) : null,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

/**
 * Rejestruje domene (kup) — wymaga kluczy + srodkow na koncie Porkbun.
 *
 * UWAGA: API ordering jest dostepne tylko dla zweryfikowanych kont
 * z dodatnim saldem. Bez kluczy zwracamy `not_configured` — frontend
 * pokazuje komunikat.
 */
export async function registerPorkbunDomain(
  domain: string,
): Promise<
  | { ok: true; orderId?: string }
  | { ok: false; error: string }
> {
  const creds = getCreds();
  if (!creds) return { ok: false, error: "not_configured" };

  try {
    const res = await fetch(
      `${PORKBUN_BASE}/domain/order/${encodeURIComponent(domain)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Item 46: whoisPrivacy=yes - włącza darmową prywatność danych
        // rejestracyjnych (Porkbun robi to bezpłatnie dla wszystkich TLD).
        // Bez tego flagi dane właściciela byłyby publiczne w WHOIS.
        body: JSON.stringify({
          ...creds,
          years: 1,
          whoisPrivacy: "yes",
        }),
      },
    );
    if (!res.ok) return { ok: false, error: `Porkbun HTTP ${res.status}` };
    const data = (await res.json()) as {
      status: "SUCCESS" | "ERROR";
      orderId?: string;
      message?: string;
    };
    if (data.status !== "SUCCESS") {
      return { ok: false, error: data.message ?? "Order rejected" };
    }
    return { ok: true, orderId: data.orderId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

export { extractTld };
