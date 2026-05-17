import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const maxDuration = 60;

type Params = Promise<{ id: string }>;

function getContentType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    html: "text/html; charset=utf-8",
    js: "application/javascript; charset=utf-8",
    mjs: "application/javascript; charset=utf-8",
    cjs: "application/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    json: "application/json; charset=utf-8",
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    txt: "text/plain; charset=utf-8",
    xml: "application/xml",
    map: "application/json",
  };
  return map[ext] ?? "application/octet-stream";
}

/**
 * Rekurencyjnie usuwa pliki z `deployed-sites/{projectId}/` (2 poziomy głębokości).
 * Covers: index.html, assets/*, favicon.ico, etc.
 */
async function deleteStoragePrefix(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storage: any,
  projectId: string,
) {
  const { data: topLevel } = await storage
    .from("deployed-sites")
    .list(projectId);

  if (!topLevel?.length) return;

  const paths: string[] = [];
  for (const item of topLevel as Array<{ name: string; id: string | null }>) {
    if (item.id) {
      paths.push(`${projectId}/${item.name}`);
    } else {
      const { data: sub } = await storage
        .from("deployed-sites")
        .list(`${projectId}/${item.name}`);
      if (sub?.length) {
        for (const subItem of sub as Array<{
          name: string;
          id: string | null;
        }>) {
          if (subItem.id) {
            paths.push(`${projectId}/${item.name}/${subItem.name}`);
          }
        }
      }
    }
  }

  if (paths.length) {
    await storage.from("deployed-sites").remove(paths);
  }
}

/**
 * POST /api/projects/[id]/deploy-static
 *
 * Body: { files: Record<string, string> }
 *   Klucze to ścieżki z buildu (np. "/index.html", "/assets/main-abc.js").
 *   Wartości to treść UTF-8.
 *
 * Weryfikuje właściciela projektu, uploaduje do Supabase Storage
 * pod ścieżką `deployed-sites/{projectId}/{filepath}` i ustawia
 * `projects.static_deployed_at`.
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

  let body: { files: Record<string, string> };
  try {
    body = (await req.json()) as { files: Record<string, string> };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.files || typeof body.files !== "object") {
    return NextResponse.json({ error: "Missing files" }, { status: 400 });
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

  // Item 14: orphan cleanup. Usuwamy wszystkie stare pliki z poprzedniego
  // builda PRZED uploadem nowych, żeby chunki Vite z innymi hashami nie zostały.
  // Failujemy miękko: jeśli usuwanie się nie powiedzie, idziemy dalej (upsert
  // i tak nadpisze pliki o tych samych nazwach).
  try {
    await deleteStoragePrefix(admin.storage, id);
  } catch (e) {
    console.warn("[deploy-static] orphan cleanup failed", e);
  }

  const entries = Object.entries(body.files);
  const uploadedPaths: string[] = [];
  const errors: string[] = [];

  // Item 19: cacheControl=300 (5 minut) - republikacja widoczna szybko,
  // bez konieczności bustowania CDN. Krytyczne pliki HTML mają i tak
  // no-store na proxy.ts level.
  const UPLOAD_CACHE_CONTROL = "300";

  // Item 20 + concurrency: uploady robimy równolegle (Promise.all) i flagę
  // static_deployed_at ustawiamy DOPIERO gdy WSZYSTKIE pliki się przesłały.
  // Jeśli choć jeden zawiedzie - flagi nie ustawiamy, użytkownik widzi błąd.
  const results = await Promise.all(
    entries.map(async ([path, content]) => {
      const normalized = path.startsWith("/") ? path : `/${path}`;
      // Item 16: ścieżki w Storage zawsze przechowujemy w surowej formie
      // (UTF-8); proxy.ts dekoduje przy odczycie. Tutaj tylko upewniamy się że
      // nie ma /../ w środku.
      if (normalized.includes("..")) {
        return { path, ok: false, message: "Niedozwolona ścieżka (..)" };
      }
      const storagePath = `${id}${normalized}`;
      const contentType = getContentType(normalized);

      const { error } = await admin.storage
        .from("deployed-sites")
        .upload(storagePath, Buffer.from(content, "utf-8"), {
          contentType,
          upsert: true,
          cacheControl: UPLOAD_CACHE_CONTROL,
        });

      if (error) {
        return { path, ok: false, message: error.message };
      }
      return { path, ok: true, storagePath };
    }),
  );

  for (const r of results) {
    if (r.ok) {
      uploadedPaths.push(r.storagePath!);
    } else {
      errors.push(`${r.path}: ${r.message}`);
    }
  }

  const indexUploaded = uploadedPaths.some((p) => p.endsWith("/index.html"));
  // Item 20: atomicznie - flagę stawiamy tylko gdy index ORAZ wszystkie inne
  // pliki przeszły. Inaczej zostawiamy poprzedni stan (jeśli był) lub null.
  const allOk = errors.length === 0 && indexUploaded;
  let staticDeployedAt: string | null = null;
  if (allOk) {
    staticDeployedAt = new Date().toISOString();
    await supabase
      .from("projects")
      .update({ static_deployed_at: staticDeployedAt })
      .eq("id", id);
  }

  return NextResponse.json({
    ok: allOk,
    uploaded: uploadedPaths.length,
    errors,
    staticDeployedAt,
  });
}

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
    await deleteStoragePrefix(admin.storage, id);
  }

  await supabase
    .from("projects")
    .update({ static_deployed_at: null })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
