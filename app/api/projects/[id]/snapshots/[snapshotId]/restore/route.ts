import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSnapshot, updateProjectFiles } from "@/lib/projects";

type Params = { params: Promise<{ id: string; snapshotId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id, snapshotId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshot = await getSnapshot(snapshotId);
  if (!snapshot || snapshot.project_id !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await updateProjectFiles(id, snapshot.files);
  return NextResponse.json({ ok: true, files: snapshot.files });
}
