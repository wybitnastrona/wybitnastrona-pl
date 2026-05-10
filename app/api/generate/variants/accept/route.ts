import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateProjectFiles, createSnapshot, getProject } from "@/lib/projects";
import type { ProjectFiles } from "@/lib/types/project";

export const runtime = "nodejs";

/**
 * Zaakceptuj wybrany wariant A/B testu — zapisz pliki do projektu, stwórz snapshot.
 * Body: { projectId: string, files: ProjectFiles, label?: string }
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { projectId?: string; files?: ProjectFiles; label?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { projectId, files, label } = body;
  if (!projectId || !files) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const project = await getProject(projectId);
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Snapshot poprzedniej wersji.
  await createSnapshot(
    projectId,
    project.files,
    label ?? "Przed A/B accept",
  ).catch(() => {});

  // Mergeujemy z istniejacym projektem (zachowujemy index.html, index.tsx etc.)
  const merged: ProjectFiles = { ...project.files, ...files };
  await updateProjectFiles(projectId, merged);

  return NextResponse.json({ ok: true });
}
