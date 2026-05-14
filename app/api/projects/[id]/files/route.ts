import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateProjectFiles } from "@/lib/projects";
import { persistPreviewSnapshot } from "@/lib/preview-snapshot";
import type { ProjectFiles } from "@/lib/types/project";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/projects/[id]/files
 * Body: { files: ProjectFiles }
 *
 * Umozliwia zapis recznych edycji z edytora Sandpack.
 * Endpoint jest wywoływany przez debounce hook w SandpackSaver.
 */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Sprawdz, czy projekt nalezy do uzytkownika.
  const { data: project } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let files: ProjectFiles;
  try {
    const body = await req.json();
    files = body.files as ProjectFiles;
    if (!files || typeof files !== "object") throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  await updateProjectFiles(id, files);
  // Fire-and-forget: generuj preview snapshot w tle (nie blokuj odpowiedzi).
  void persistPreviewSnapshot(supabase, id, files);
  return NextResponse.json({ ok: true });
}
