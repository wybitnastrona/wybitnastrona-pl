import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listSnapshots } from "@/lib/projects";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshots = await listSnapshots(id);
  return NextResponse.json(snapshots);
}
