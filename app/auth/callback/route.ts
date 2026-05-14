import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Auth callback handler — obsluguje:
 * - OAuth (Google, GitHub) → param `code` (PKCE flow).
 * - Email confirmation / magic link → param `token_hash` + `type` (sygnatura
 *   verifyOtp, ktorej Supabase uzywa dla potwierdzen email/recovery/invite).
 *
 * Po wymianie kodu/tokena sprawdzamy onboarding. Nowi uzytkownicy
 * (onboarding_completed = false) trafiaja na /onboarding; istniejacy na `next` (/).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";
  const errorParam = searchParams.get("error");

  if (errorParam) {
    const errorDesc = searchParams.get("error_description") ?? errorParam;
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(errorDesc)}`,
    );
  }

  if (!code && !tokenHash) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent("Brak kodu lub token_hash w linku potwierdzającym.")}`,
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent("Brak konfiguracji Supabase (env).")}`,
    );
  }

  // Build the final redirect response up-front so we can attach cookies to it.
  const baseRedirectUrl = next.startsWith("/")
    ? `${origin}${next}`
    : `${origin}/`;
  const response = NextResponse.redirect(baseRedirectUrl);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Email confirmation flow (verifyOtp).
  if (!code && tokenHash) {
    const type: EmailOtpType = otpType ?? "email";
    const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (otpError) {
      console.error("[auth/callback] verifyOtp error:", otpError);
      return NextResponse.redirect(
        `${origin}/auth/error?message=${encodeURIComponent(otpError.message)}`,
      );
    }
    return await routeAfterAuth(supabase, otpData?.user?.id, response, origin);
  }

  const { data: sessionData, error } =
    await supabase.auth.exchangeCodeForSession(code!);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error);
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(error.message)}`,
    );
  }

  return await routeAfterAuth(supabase, sessionData?.user?.id, response, origin);
}

type SupabaseServer = ReturnType<typeof createServerClient>;

/**
 * Po udanym uwierzytelnieniu (OAuth lub email) sprawdza status onboardingu i
 * redirectuje uzytkownika do /onboarding (nowi) lub `next` URL (z istniejacym
 * profile). Cookies sa zachowywane.
 */
async function routeAfterAuth(
  supabase: SupabaseServer,
  userId: string | undefined,
  baseResponse: NextResponse,
  origin: string,
): Promise<NextResponse> {
  if (!userId) return baseResponse;

  // Program polecen — attach referral jezeli cookie wybitna_ref jest ustawione.
  try {
    await attachReferralIfPresent(supabase, userId, baseResponse);
  } catch (e) {
    console.warn("[auth/callback] attachReferralIfPresent failed:", e);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.onboarding_completed) return baseResponse;

  const onboardingResponse = NextResponse.redirect(`${origin}/onboarding`);
  baseResponse.cookies
    .getAll()
    .forEach(({ name, value, ...opts }) =>
      onboardingResponse.cookies.set(name, value, opts),
    );
  return onboardingResponse;
}

/**
 * Po rejestracji odczytuje cookie `wybitna_ref` i wpisuje rekord do tabeli
 * `referrals`. Cookie jest kasowane po attache (max-age 0). Unique (referee_id)
 * w bazie zabezpiecza przed double-attach.
 */
async function attachReferralIfPresent(
  supabase: SupabaseServer,
  userId: string,
  response: NextResponse,
): Promise<void> {
  const refCookie = response.cookies.get("wybitna_ref")?.value;
  if (!refCookie) return;

  const cleanCode = refCookie.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
  if (!cleanCode) return;

  const { data: referrer } = await supabase
    .from("profiles")
    .select("id")
    .eq("referral_code", cleanCode)
    .maybeSingle();

  if (referrer && referrer.id !== userId) {
    await supabase
      .from("referrals")
      .insert({ referrer_id: referrer.id, referee_id: userId });
  }

  // Wyczysc cookie zeby nie attachowac ponownie przy kolejnych logowaniach.
  response.cookies.set("wybitna_ref", "", { path: "/", maxAge: 0 });
}
