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

  const uploadedPaths: string[] = [];
  const errors: string[] = [];

  for (const [path, content] of Object.entries(body.files)) {
    // Normalize path: ensure leading slash, then strip for storage key
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const storagePath = `${id}${normalized}`; // e.g. "{id}/index.html"
    const contentType = getContentType(normalized);

    const { error } = await admin.storage
      .from("deployed-sites")
      .upload(storagePath, Buffer.from(content, "utf-8"), {
        contentType,
        upsert: true,
      });

    if (error) {
      errors.push(`${path}: ${error.message}`);
    } else {
      uploadedPaths.push(storagePath);
    }
  }

  // Ustaw static_deployed_at nawet jeśli część plików się nie przesłała —
  // jeśli index.html jest OK, strona będzie działać.
  const indexUploaded = uploadedPaths.some((p) => p.endsWith("/index.html"));
  if (indexUploaded) {
    await supabase
      .from("projects")
      .update({ static_deployed_at: new Date().toISOString() })
      .eq("id", id);
  }

  return NextResponse.json({
    ok: true,
    uploaded: uploadedPaths.length,
    errors,
    staticDeployedAt: indexUploaded ? new Date().toISOString() : null,
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
