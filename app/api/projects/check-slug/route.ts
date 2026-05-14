import { NextResponse } from "next/server";
import { isSlugAvailable, isValidPublishSlug } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/projects/check-slug?slug=foo&excludeProjectId=...
 *
 * Live check dostepnosci subdomeny dla PublishDialog (debounce 350ms).
 * Zwraca:
 *   200: { available: boolean, valid: boolean, error?: string }
 *   401: brak usera
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { available: false, valid: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") ?? "").trim().toLowerCase();
  const excludeProjectId =
    url.searchParams.get("excludeProjectId") ?? undefined;

  if (!slug) {
    return NextResponse.json({
      available: false,
      valid: false,
      error: "Subdomena jest wymagana.",
    });
  }

  if (!isValidPublishSlug(slug)) {
    return NextResponse.json({
      available: false,
      valid: false,
      error:
        "Niepoprawny format: 3-32 znakow (a-z, 0-9, -); bez myslnikow na poczatku/koncu.",
    });
  }

  const available = await isSlugAvailable(slug, excludeProjectId);
  return NextResponse.json({
    available,
    valid: true,
    error: available ? undefined : "Ta subdomena jest juz zajeta.",
  });
}
