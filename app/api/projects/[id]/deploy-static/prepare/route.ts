import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  deleteStoragePrefix,
  getContentType,
  isAllowedFile,
  normalizeDeployPath,
} from "@/lib/static-deploy";

export const maxDuration = 60;

type Params = Promise<{ id: string }>;

/**
 * Maks. liczba plików dla jednego deployu. Vite/Rspack mogą generować
 * setki chunków przy code-splittingu, ale 500 to bezpieczny ceiling
 * który chroni przed atakiem flood/DoS oraz przed kosztownym `createSignedUploadUrl`
 * loopem dla 10_000 fake paths.
 */
const MAX_FILES = 500;

/**
 * POST /api/projects/[id]/deploy-static/prepare
 *
 * Body: { paths: string[] }   // relatywne, np. "index.html", "assets/main.js"
 *
 * Generuje krótkotrwałe signed upload URLs dla każdej ścieżki w buckecie
 * `deployed-sites` pod prefiksem `{projectId}/`. Klient (wc-runtime) używa
 * tych URL-i do bezpośredniego PUT bytes do Storage, omijając Vercel
 * payload limit (4.5MB).
 *
 * Robi też orphan cleanup — usuwa wszystkie stare pliki z poprzedniego
 * buildu PRZED wygenerowaniem nowych signed URL, żeby chunki Vite z innymi
 * hashami nie zostały. Failuje miękko.
 *
 * Response: { uploads: Array<{ path, signedUrl, token, contentType }> }
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

  let body: { paths: string[] };
  try {
    body = (await req.json()) as { paths: string[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body?.paths) || body.paths.length === 0) {
    return NextResponse.json(
      { error: "Brak ścieżek do uploadu (paths must be non-empty array)." },
      { status: 400 },
    );
  }
  if (body.paths.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Za dużo plików (${body.paths.length} > ${MAX_FILES}).` },
      { status: 400 },
    );
  }

  const normalized: string[] = [];
  const rejected: Array<{ path: string; reason: string }> = [];
  for (const p of body.paths) {
    if (typeof p !== "string") {
      rejected.push({ path: String(p), reason: "not a string" });
      continue;
    }
    const n = normalizeDeployPath(p);
    if (!n) {
      rejected.push({ path: p, reason: "niedozwolona ścieżka (.. lub puste)" });
      continue;
    }
    if (!isAllowedFile(n)) {
      rejected.push({ path: p, reason: "niedozwolone rozszerzenie" });
      continue;
    }
    normalized.push(n);
  }

  if (normalized.length === 0) {
    return NextResponse.json(
      { error: "Wszystkie ścieżki odrzucone.", rejected },
      { status: 400 },
    );
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

  // Orphan cleanup PRZED nowymi signed URL — chcemy żeby stare chunki Vite
  // (z innymi hashami) zniknęły. Failujemy miękko: jeśli się nie powiedzie,
  // upsert+nadpisanie i tak załatwi nazwy które się powtarzają.
  try {
    await deleteStoragePrefix(admin.storage, id);
  } catch (e) {
    console.warn("[deploy-static/prepare] orphan cleanup failed", e);
  }

  type Upload = {
    path: string; // bez leading slash, np. "assets/main.js"
    signedUrl: string;
    token: string;
    contentType: string; // dla referencji frontu (PUT ustawia ten Content-Type)
  };

  const uploads: Upload[] = [];
  const errors: string[] = [];

  await Promise.all(
    normalized.map(async (relPath) => {
      const storagePath = `${id}/${relPath}`;
      const { data, error } = await admin.storage
        .from("deployed-sites")
        .createSignedUploadUrl(storagePath, { upsert: true });

      if (error || !data) {
        errors.push(`${relPath}: ${error?.message ?? "no data"}`);
        return;
      }
      uploads.push({
        path: relPath,
        signedUrl: data.signedUrl,
        token: data.token,
        contentType: getContentType(relPath),
      });
    }),
  );

  if (uploads.length === 0) {
    return NextResponse.json(
      { error: "Nie udało się wygenerować żadnego signed URL.", errors },
      { status: 500 },
    );
  }

  return NextResponse.json({
    uploads,
    rejected,
    errors,
    bucket: "deployed-sites",
    projectId: id,
  });
}
