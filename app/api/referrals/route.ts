import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/referrals — zwraca:
 *   - referral_code zalogowanego usera (lazy-generated przez ensure_referral_code)
 *   - liste zaproszonych z `referrals` (status: pending / awarded)
 *   - sumaryczny reward
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Zapewnij ze user ma referral_code (lazy create).
  const { data: codeData } = await supabase.rpc("ensure_referral_code", {
    p_user_id: user.id,
  });

  const { data: rows } = await supabase
    .from("referrals")
    .select(
      "id, referee_id, referee_first_payment_at, reward_credits, awarded_at, created_at",
    )
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  const totalRewards = (rows ?? []).reduce(
    (sum, r) => sum + (r.reward_credits ?? 0),
    0,
  );

  return NextResponse.json({
    referralCode: codeData ?? null,
    referrals: rows ?? [],
    totalRewards,
  });
}

/**
 * POST /api/referrals/attach — wywolywane po rejestracji nowego usera.
 * Body: { code: string }. Insertuje wpis do `referrals` jezeli code jest valid,
 * referrer nie jest taki sam jak nowy user, i wpis dla tego referee jeszcze nie istnieje.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = (body.code ?? "").trim();
  if (!code) return NextResponse.json({ ok: true, attached: false });

  // Znajdz referrer po kodzie.
  const { data: referrer } = await supabase
    .from("profiles")
    .select("id")
    .eq("referral_code", code)
    .maybeSingle();

  if (!referrer || referrer.id === user.id) {
    return NextResponse.json({ ok: true, attached: false });
  }

  // Insertuj — unique(referee_id) zabezpiecza przed double-attach.
  const { error } = await supabase.from("referrals").insert({
    referrer_id: referrer.id,
    referee_id: user.id,
  });
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, attached: true });
}
