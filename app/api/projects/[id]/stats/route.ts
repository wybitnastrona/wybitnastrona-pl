import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

/**
 * GET /api/projects/[id]/stats?days=1|7|14|30&bucket_hours=6|12|24
 *
 * Zwraca eventy projektu agregowane per bucket czasowy + typ. UI pozwala
 * wybrac jeden z presetow:
 *   - days=7,  bucket_hours=6   → 28 slupkow co 6h
 *   - days=14, bucket_hours=12  → 28 slupkow co 12h
 *   - days=30, bucket_hours=24  → 30 slupkow dziennych
 *
 * Wstecznie zwraca tez `day` (= bucket sformatowany jako YYYY-MM-DD HH:MM)
 * dla istniejacych klientow chartu.
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
  const bucketParam = Number(url.searchParams.get("bucket_hours") ?? "24");

  // Allowlist — bez tego user moglby wymusic bardzo male buckety = drogie
  // zapytanie. (cap bezpieczenstwa)
  const days = [1, 7, 14, 30].includes(daysParam) ? daysParam : 30;
  const bucketHours = [1, 6, 12, 24].includes(bucketParam) ? bucketParam : 24;

  const { data, error } = await supabase.rpc("get_project_stats_v2", {
    p_project_id: id,
    p_days: days,
    p_bucket_hours: bucketHours,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = { bucket: string; event_type: string; count: number };
  const rows = (data as Row[] | null) ?? [];

  // Format wstecznie kompatybilny — `day` to klucz bucketu uzywany przez
  // istniejacy chart, np. "2026-05-15 18:00".
  const events = rows.map((r) => {
    const iso = r.bucket;
    let day = iso;
    if (typeof iso === "string") {
      // Trim do "YYYY-MM-DD HH:MM" dla czytelnosci x-axis.
      day = iso.slice(0, 16).replace("T", " ");
    }
    return {
      event_type: r.event_type,
      count: Number(r.count),
      day,
      bucket: r.bucket,
    };
  });

  return NextResponse.json({ days, bucketHours, events });
}
