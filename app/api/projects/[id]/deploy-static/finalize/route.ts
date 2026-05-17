import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/**
 * POST /api/projects/[id]/deploy-static/finalize
 *
 * Wywoływane przez klienta (wc-runtime) PO udanym uploadzie wszystkich
 * plików bezpośrednio do Supabase Storage przez pre-signed URLs.
 *
 * Logika:
 *  1. Sprawdza właściciela projektu.
 *  2. Weryfikuje, że w `deployed-sites/{projectId}/` istnieje `index.html`
 *     (HEAD na public URL — szybkie i nie wymaga listy 100+ plików).
 *  3. Ustawia `static_deployed_at = now()`.
 *
 * Body: { uploadedCount?: number; errors?: string[] }  (opcjonalnie do logów)
 * Response: { ok: boolean; staticDeployedAt: string | null; error?: string }
 */
export async function POST(req: Request, { params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, user_id, is_public")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!project.is_public) {
    return NextResponse.json(
      { error: "Opublikuj projekt przed deployem statycznym." },
      { status: 400 },
    );
  }

  // Body jest opcjonalne i tylko do logów; ignorujemy parsing errors.
  let clientReport: { uploadedCount?: number; errors?: string[] } | null = null;
  try {
    clientReport = (await req.json()) as {
      uploadedCount?: number;
      errors?: string[];
    };
  } catch {
    // brak body / nie-JSON - to ok
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Storage not configured" },
      { status: 500 },
    );
  }

  const admin = createServiceClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Weryfikacja: list folder i sprawdź, czy `index.html` jest w środku.
  // To pewniejsze niż HEAD na public URL bo bucket może być prywatny.
  const { data: rootList, error: listError } = await admin.storage
    .from("deployed-sites")
    .list(id, { limit: 100 });

  if (listError) {
    return NextResponse.json(
      { error: `Storage list failed: ${listError.message}` },
      { status: 500 },
    );
  }

  const hasIndex = (rootList ?? []).some(
    (item) => item.id !== null && item.name === "index.html",
  );

  if (!hasIndex) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Brak index.html w Storage — upload się nie zakończył. Spróbuj ponownie.",
        clientReport,
      },
      { status: 409 },
    );
  }

  const staticDeployedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("projects")
    .update({ static_deployed_at: staticDeployedAt })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: `DB update failed: ${updateError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    staticDeployedAt,
    clientReport,
  });
}
