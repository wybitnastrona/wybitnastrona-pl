import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDomainPrice } from "@/lib/vercel";

export const runtime = "nodejs";

const DOMAIN_REGEX =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

/**
 * GET /api/domains/search?q=example.com
 *
 * Sprawdza dostepnosc + cene domeny przez Vercel Domains API.
 * Wymaga zalogowania.
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

  const cleaned = query.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!DOMAIN_REGEX.test(cleaned)) {
    return NextResponse.json(
      { error: "Nieprawidlowy format domeny" },
      { status: 400 },
    );
  }

  if (!process.env.VERCEL_TOKEN) {
    return NextResponse.json(
      {
        error: "not_configured",
        message: "Vercel Domains API nie jest skonfigurowane na serwerze.",
      },
      { status: 503 },
    );
  }

  try {
    const result = await getDomainPrice(cleaned);
    return NextResponse.json({
      domain: cleaned,
      available: result.available,
      price: result.price,
      period: result.period,
      currency: result.currency ?? "USD",
      error: result.error,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 },
    );
  }
}
