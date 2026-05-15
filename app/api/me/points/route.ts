import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FREE_TIER_LIMITS } from "@/lib/ai-models";

export const dynamic = "force-dynamic";

/**
 * Zwraca biezacy stan kredytow zalogowanego uzytkownika + jego tier.
 *
 * Pole `monthlyLimit` jest uzywane m.in. przez pasek postepu w SideNav.
 * - FREE: 1500 (stala z FREE_TIER_LIMITS)
 * - PRO:  wartosc z profiles.monthly_credits_limit (ustawiana przez webhook
 *         Stripe na podstawie product.points w `subscription.created/updated`)
 *
 * Brak kolumny w bazie (np. zanim migracja 0042 wejdzie) traktujemy
 * defensywnie — fallback do 1500.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Probujemy najpierw wybrac z monthly_credits_limit; jak kolumna nie istnieje,
  // PostgREST zwroci blad — wtedy retry bez tego pola.
  let row: {
    points?: number | null;
    tier?: string | null;
    stripe_subscription_status?: string | null;
    monthly_credits_limit?: number | null;
  } | null = null;

  const withLimit = await supabase
    .from("profiles")
    .select(
      "points, tier, stripe_subscription_status, monthly_credits_limit",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (withLimit.error) {
    // Najczesciej "column profiles.monthly_credits_limit does not exist" —
    // graceful fallback przed deployem migracji.
    const fallback = await supabase
      .from("profiles")
      .select("points, tier, stripe_subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    if (fallback.error) {
      return NextResponse.json(
        { error: fallback.error.message },
        { status: 500 },
      );
    }
    row = fallback.data;
  } else {
    row = withLimit.data;
  }

  const tier = (row?.tier as string | null) ?? "free";
  const status = row?.stripe_subscription_status as string | null;
  const isPro =
    tier === "pro" && (status === "active" || status === "trialing");

  const points = (row?.points as number | null) ?? 0;
  const monthlyLimit =
    (row?.monthly_credits_limit as number | null) ??
    FREE_TIER_LIMITS.monthlyCredits;

  return NextResponse.json({
    points,
    monthlyLimit,
    tier,
    isPro,
  });
}
