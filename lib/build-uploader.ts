import "server-only";

/**
 * Build Uploader.
 *
 * Codemagic / EAS Build wymagaja zrodla kodu w git lub jako ZIP via URL.
 * Wystawiamy spakowany projekt jako tymczasowy plik w Supabase Storage
 * (bucket "submissions-uploads"). Codemagic pobiera w pre-build hook
 * (deklarowany w `codemagic.yaml` po stronie templatu).
 *
 * Caveat: zalozenie ze bucket `submissions-uploads` istnieje i ma policy
 * public-read time-limited (signed URL). Migracja do bucket — w settings
 * Supabase Storage Dashboard.
 */

import { createClient as createServiceClient } from "@supabase/supabase-js";
import JSZip from "jszip";
import type { Project } from "@/lib/types/project";

const STORAGE_BUCKET = "submissions-uploads";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role not configured");
  }
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Pakuje pliki projektu do ZIP, wysyla do Supabase Storage,
 * zwraca signed URL waznym 1h.
 */
export async function uploadProjectZip(
  project: Pick<Project, "id" | "files">,
): Promise<string> {
  const zip = new JSZip();
  for (const [path, file] of Object.entries(project.files)) {
    const code =
      typeof file === "object" && "code" in file ? file.code : String(file);
    zip.file(path.replace(/^\//, ""), code);
  }
  const buffer = await zip.generateAsync({ type: "uint8array" });

  const supabase = getServiceClient();
  const objectPath = `${project.id}/${Date.now()}.zip`;

  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, buffer, {
      contentType: "application/zip",
      upsert: false,
    });

  if (uploadErr) {
    throw new Error(`Storage upload failed: ${uploadErr.message}`);
  }

  // Signed URL — Codemagic ma 1h zeby pobrac.
  const { data: signed, error: signErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(objectPath, 60 * 60);

  if (signErr || !signed) {
    throw new Error(`Storage sign failed: ${signErr?.message ?? "no url"}`);
  }

  return signed.signedUrl;
}
