import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

/**
 * GET /api/projects/[id]/stats?days=1|7|30
 *
 * Zwraca eventy projektu agregowane per dzien + typ. Sluzy do wykresu
 * analytics w panelu Ustawien projektu (Day / Week / Month).
 */
export async function GET(req: Request, { params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await getProject(id);
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const daysParam = Number(url.searchParams.get("days") ?? "30");
  const days = [1, 7, 30].includes(daysParam) ? daysParam : 30;

  const { data, error } = await supabase.rpc("get_project_stats", {
    p_project_id: id,
    p_days: days,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    days,
    events:
      (data as Array<{ event_type: string; count: number; day: string }>) ?? [],
  });
}
