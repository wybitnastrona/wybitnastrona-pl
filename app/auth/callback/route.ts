import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * OAuth callback handler (Google, GitHub, etc.).
 *
 * Bug "works only on the second try":
 * The issue is that NextResponse.redirect() is called before the session
 * cookies are fully flushed onto the response, so the *next* request (the
 * redirect target) arrives without a valid session and the middleware
 * re-creates an empty one — losing the just-set tokens.
 *
 * Fix: build the final redirect response FIRST, then attach all cookies to
 * that same response object instead of doing a two-hop redirect.
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
  const redirectUrl = next.startsWith("/")
    ? `${origin}${next}`
    : `${origin}/`;
  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Write cookies to both the request (for SSR reads within this handler)
        // AND the response (so the browser receives them with the redirect).
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error);
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(error.message)}`,
    );
  }

  return response;
}
