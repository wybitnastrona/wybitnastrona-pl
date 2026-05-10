import { NextResponse } from "next/server";
import { listMyProjects } from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const projects = await listMyProjects();
  return NextResponse.json(projects);
}
