import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProject, getSnapshot } from "@/lib/projects";

type Params = Promise<{ id: string; snapshotId: string }>;

/**
 * Pobierz pelna zawartosc snapshotu (z plikami) — uzywane do diffu.
 */
export async function GET(_req: Request, { params }: { params: Params }) {
  const { id, snapshotId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await getProject(id);
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const snap = await getSnapshot(snapshotId);
  if (!snap || snap.project_id !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(snap);
}
