import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FREE_TIER_LIMITS } from "@/lib/ai-models";

export const dynamic = "force-dynamic";

const FREE_RESPONSE = {
  points: 0,
  monthlyLimit: FREE_TIER_LIMITS.monthlyCredits,
  tier: "free",
  isPro: false,
};

/**
 * Zwraca biezacy stan kredytow zalogowanego uzytkownika + jego tier.
 *
 * Pole `monthlyLimit` jest uzywane m.in. przez pasek postepu w SideNav.
 * - FREE: 1500 (stala z FREE_TIER_LIMITS)
 * - PRO:  wartosc z profiles.monthly_credits_limit (ustawiana przez webhook
 *         Stripe na podstawie product.points w `subscription.created/updated`)
 *
 * Brak kredytow i brak kolumn Stripe (przed migracja 0043) NIE moze
 * blokowac ladowania strony. Endpoint nigdy nie zwraca 500 dla zalogowanego
 * uzytkownika — zawsze odpowiada sensownym fallbackiem FREE.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Probujemy kolejno coraz prostsze zapytania, az jedno zadziala.
  // Jezeli wszystkie padna (baza niedostepna, brak uprawnien) — zwracamy
  // bezpieczny fallback FREE zamiast 500. SideNav / Pricing zostanie
  // wyrenderowany z zerowym saldem, co jest poprawnym UX.

  // Proba 1: pełne zapytanie z wszystkimi kolumnami (po migracji 0042+0043)
  const full = await supabase
    .from("profiles")
    .select("points, tier, stripe_subscription_status, monthly_credits_limit")
    .eq("id", user.id)
    .maybeSingle();

  if (!full.error && full.data) {
    return buildResponse(full.data);
  }

  // Proba 2: bez monthly_credits_limit (brak migracji 0042)
  const withStripe = await supabase
    .from("profiles")
    .select("points, tier, stripe_subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  if (!withStripe.error && withStripe.data) {
    return buildResponse(withStripe.data);
  }

  // Proba 3: tylko podstawowe kolumny (brak migracji 0043 — brak stripe_*)
  const basic = await supabase
    .from("profiles")
    .select("points, tier")
    .eq("id", user.id)
    .maybeSingle();

  if (!basic.error && basic.data) {
    return buildResponse(basic.data);
  }

  // Proba 4: fallback absolutny — nie blokujemy UI dla zalogowanego uzytkownika
  console.error(
    "[/api/me/points] Wszystkie zapytania do profiles nie powiodly sie:",
    basic.error?.message,
  );
  return NextResponse.json(FREE_RESPONSE);
}

function buildResponse(row: {
  points?: number | null;
  tier?: string | null;
  stripe_subscription_status?: string | null;
  monthly_credits_limit?: number | null;
}) {
  const tier = (row.tier as string | null) ?? "free";
  const status = row.stripe_subscription_status as string | null;
  const isPro =
    tier === "pro" && (status === "active" || status === "trialing");
  const points = (row.points as number | null) ?? 0;
  const monthlyLimit =
    (row.monthly_credits_limit as number | null) ??
    FREE_TIER_LIMITS.monthlyCredits;

  return NextResponse.json({ points, monthlyLimit, tier, isPro });
}
