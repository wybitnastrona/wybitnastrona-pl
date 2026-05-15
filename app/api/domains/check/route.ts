import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DOMAIN_COMMISSION_USD,
  checkPorkbunAvailability,
  extractTld,
  getPorkbunTldPrice,
} from "@/lib/porkbun";

export const runtime = "nodejs";

const DOMAIN_REGEX =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

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
