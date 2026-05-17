import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DOMAIN_COMMISSION_USD,
  checkPorkbunAvailability,
  extractTld,
  getPorkbunTldPrice,
} from "@/lib/porkbun";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const DOMAIN_REGEX =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

function isPorkbunConfigured(): boolean {
  return Boolean(
    process.env.PORKBUN_API_KEY &&
      process.env.PORKBUN_SECRET_KEY &&
      process.env.PORKBUN_API_KEY !== "REPLACE_ME",
  );
}

/**
 * GET /api/domains/check?q=example.com
 *
 * Sprawdza dostepnosc + cene domeny przez Porkbun API (z fallbackiem do
 * publicznego cennika TLD jezeli klucze nie sa skonfigurowane). Dodaje
 * marze wybitnastrona.pl ($5).
 *
 * Format odpowiedzi:
 *   {
 *     domain, available, registrar: "porkbun",
 *     basePrice: number (USD, rejestracja na rok),
 *     commission: 5,
 *     total: basePrice + 5,
 *     currency: "USD"
 *   }
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Item 41: jeśli Porkbun nie jest skonfigurowany - 503 z czytelną wiadomością.
  // UI w DomainsDialog pokaże banner zamiast pustego stanu.
  if (!isPorkbunConfigured()) {
    return NextResponse.json(
      {
        error: "Porkbun not configured",
        message:
          "Kupno domen jest tymczasowo niedostępne - skontaktuj się z kontakt@wybitnastrona.pl.",
      },
      { status: 503 },
    );
  }

  // Item 47: rate limit (10 req/min per user, 30 req/min per IP).
  const ip = getClientIp(req);
  const userLimit = rateLimit(`domains-check:user:${user.id}`, 10, 60_000);
  const ipLimit = rateLimit(`domains-check:ip:${ip}`, 30, 60_000);
  if (!userLimit.allowed || !ipLimit.allowed) {
    const retryAfter = Math.max(
      userLimit.retryAfterSeconds,
      ipLimit.retryAfterSeconds,
    );
    return NextResponse.json(
      {
        error: "Too many requests",
        message: `Zbyt wiele zapytań. Spróbuj ponownie za ${retryAfter}s.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  }

  const url = new URL(req.url);
  const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  if (!query) {
    return NextResponse.json({ error: "Brak parametru q" }, { status: 400 });
  }

  let cleaned = query.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!cleaned.includes(".")) cleaned = `${cleaned}.pl`;
  if (!DOMAIN_REGEX.test(cleaned)) {
    return NextResponse.json(
      { error: "Nieprawidlowy format domeny" },
      { status: 400 },
    );
  }

  // 1. Probujemy pelnego Porkbun check (z kluczami) — najnowsze ceny.
  const avail = await checkPorkbunAvailability(cleaned);
  if (avail.ok) {
    const base = avail.price ?? avail.regularPrice ?? 0;
    return NextResponse.json({
      domain: cleaned,
      available: avail.available,
      registrar: "porkbun" as const,
      basePrice: base,
      commission: DOMAIN_COMMISSION_USD,
      total: Math.round((base + DOMAIN_COMMISSION_USD) * 100) / 100,
      currency: "USD" as const,
    });
  }

  // 2. Fallback: publiczny cennik per-TLD. Nie wiemy czy domena jest wolna,
  //    ale mozemy pokazac estymowany koszt.
  const tld = extractTld(cleaned);
  const tldPrice = tld ? await getPorkbunTldPrice(tld) : null;
  if (tldPrice != null) {
    return NextResponse.json({
      domain: cleaned,
      available: null,
      availabilityUnknown: true,
      registrar: "porkbun" as const,
      basePrice: tldPrice,
      commission: DOMAIN_COMMISSION_USD,
      total: Math.round((tldPrice + DOMAIN_COMMISSION_USD) * 100) / 100,
      currency: "USD" as const,
      message:
        avail.ok === false && avail.error === "not_configured"
          ? "Skonfiguruj PORKBUN_API_KEY zeby sprawdzic dostepnosc."
          : "Nie udalo sie sprawdzic dostepnosci — pokazujemy szacowana cene.",
    });
  }

  return NextResponse.json(
    {
      domain: cleaned,
      available: null,
      availabilityUnknown: true,
      registrar: null,
      message:
        "Porkbun jest niedostepny. Sprobuj pozniej lub uzyj wlasnej domeny.",
    },
    { status: 200 },
  );
}
