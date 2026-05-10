import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * OAuth callback handler (Google, GitHub, etc.).
 *
 * After exchanging the code for a session we check whether the user has
 * completed onboarding. New users (onboarding_completed = false) are sent
 * to /onboarding; existing users land on `next` (default: /).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const errorParam = searchParams.get("error");

  if (errorParam) {
    const errorDesc = searchParams.get("error_description") ?? errorParam;
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(errorDesc)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.redirect(`${origin}/auth/error`);
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

  const { data: sessionData, error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error);
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(error.message)}`,
    );
  }

  // Check onboarding status — redirect new users to /onboarding.
  if (sessionData?.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", sessionData.user.id)
      .maybeSingle();

    if (!profile?.onboarding_completed) {
      // New user: redirect to onboarding while keeping the auth cookies.
      const onboardingResponse = NextResponse.redirect(
        `${origin}/onboarding`,
      );
      // Copy all cookies from the original response to onboarding response.
      response.cookies.getAll().forEach(({ name, value, ...opts }) =>
        onboardingResponse.cookies.set(name, value, opts),
      );
      return onboardingResponse;
    }
  }

  return response;
}
