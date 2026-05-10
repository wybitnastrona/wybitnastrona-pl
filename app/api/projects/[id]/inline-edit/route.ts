import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateProjectFiles, createSnapshot } from "@/lib/projects";
import type { ProjectFiles } from "@/lib/types/project";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

/**
 * Inline visual editor — replaces a literal text snippet inside the project
 * source files without going through AI. The frontend sends the original and
 * new text; we perform a single search/replace across all files. The change
 * only proceeds if exactly ONE file contains the original text exactly ONCE
 * (otherwise it's ambiguous and we refuse).
 *
 * Body: { original: string, next: string }
 * Returns: { ok: true, file: string, snapshotId: string } | { ok: false, error }
 */
export async function POST(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { original?: string; next?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const original = (body.original ?? "").trim();
  const next = (body.next ?? "").trim();
  if (!original || !next) {
    return NextResponse.json(
      { error: "Both 'original' and 'next' are required" },
      { status: 400 },
    );
  }
  if (original === next) {
    return NextResponse.json({ ok: true, file: null, unchanged: true });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("user_id, files, locked_files")
    .eq("id", id)
    .maybeSingle();

  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const files = (project.files as ProjectFiles) ?? {};
  const lockedFiles = new Set<string>(
    ((project.locked_files as string[] | null) ?? []).map((p) =>
      p.startsWith("/") ? p : `/${p}`,
    ),
  );

  // Find the file(s) containing the original text. We require exactly one
  // file with exactly one occurrence — anything else is ambiguous and we
  // bail out, asking the user to use AI instead.
  const matches: Array<{ path: string; count: number }> = [];
  for (const [path, file] of Object.entries(files)) {
    if (lockedFiles.has(path)) continue;
    const code = file?.code ?? "";
    if (!code.includes(original)) continue;
    let count = 0;
    let idx = 0;
    while ((idx = code.indexOf(original, idx)) !== -1) {
      count++;
      idx += original.length;
    }
    matches.push({ path, count });
  }

  if (matches.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Nie znaleziono tekstu w żadnym pliku — być może jest złożony z wielu fragmentów.",
        ambiguous: false,
      },
      { status: 422 },
    );
  }

  const totalOccurrences = matches.reduce((sum, m) => sum + m.count, 0);
  if (totalOccurrences !== 1) {
    return NextResponse.json(
      {
        ok: false,
        error: `Tekst występuje ${totalOccurrences}× w projekcie — użyj AI, żeby zmienić wybrany fragment.`,
        ambiguous: true,
      },
      { status: 422 },
    );
  }

  const target = matches[0];
  const code = files[target.path].code;
  const updated = code.replace(original, next);
  const newFiles: ProjectFiles = {
    ...files,
    [target.path]: { ...files[target.path], code: updated },
  };

  // Snapshot before write so the user can roll back.
  await createSnapshot(
    id,
    files,
    `Inline edit: ${truncate(original, 40)} → ${truncate(next, 40)}`,
  ).catch(() => {});

  await updateProjectFiles(id, newFiles);

  return NextResponse.json({ ok: true, file: target.path });
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}
