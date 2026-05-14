import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listMyProjects } from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "unauthorized", projects: [] },
      { status: 401 },
    );
  }
  const projects = await listMyProjects();
  return NextResponse.json({ projects });
}
