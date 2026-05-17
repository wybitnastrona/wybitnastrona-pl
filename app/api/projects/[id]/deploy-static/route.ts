import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { deleteStoragePrefix } from "@/lib/static-deploy";

export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/**
 * UWAGA — stara wersja `POST /api/projects/[id]/deploy-static` (przyjmująca
 * cały payload `{ files: Record<string, string> }`) ZOSTAŁA USUNIĘTA.
 *
 * Pipeline statycznego deployu działa teraz przez pre-signed upload URLs
 * generowane przez Supabase Storage. Klient (components/webcontainer/wc-runtime.tsx)
 * wywołuje sekwencyjnie:
 *
 *   1) POST /api/projects/[id]/deploy-static/prepare
 *      → body: { paths: string[] }
 *      → odpowiedź: { uploads: [{ path, signedUrl, token, contentType }] }
 *
 *   2) PUT <signedUrl>  (dla każdego pliku, batch 5 równolegle)
 *      → wprost do Supabase Storage, omija Vercel payload limit (4.5 MB).
 *
 *   3) POST /api/projects/[id]/deploy-static/finalize
 *      → weryfikacja index.html + ustaw `projects.static_deployed_at = now()`
 *
 * Ten plik trzyma tylko handler DELETE używany przy unpublish projektu.
 */

/**
 * DELETE /api/projects/[id]/deploy-static
 * Usuwa pliki statycznego buildu z Storage i zeruje static_deployed_at.
 * Wywoływane przez /api/projects/[id]/publish (DELETE) przy cofaniu publikacji.
 */
export async function DELETE(_req: Request, { params }: { params: Params }) {
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
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    const admin = createServiceClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    try {
      await deleteStoragePrefix(admin.storage, id);
    } catch (e) {
      console.warn("[deploy-static DELETE] cleanup failed", e);
    }
  }

  await supabase
    .from("projects")
    .update({ static_deployed_at: null })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
