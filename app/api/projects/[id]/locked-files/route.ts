import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

/** GET — returns the array of locked paths for the current project. */
export async function GET(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("projects")
    .select("locked_files")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json({ lockedFiles: (data.locked_files as string[]) ?? [] });
}

/** PUT — replaces the entire locked-files list. Body: { lockedFiles: string[] } */
export async function PUT(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { lockedFiles?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    !Array.isArray(body.lockedFiles) ||
    !body.lockedFiles.every((p) => typeof p === "string")
  ) {
    return NextResponse.json(
      { error: "lockedFiles must be string[]" },
      { status: 400 },
    );
  }

  // Normalize paths: strip duplicates, ensure leading "/".
  const normalized = Array.from(
    new Set(
      (body.lockedFiles as string[]).map((p) =>
        p.startsWith("/") ? p : `/${p}`,
      ),
    ),
  );

  const { error } = await supabase
    .from("projects")
    .update({ locked_files: normalized })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, lockedFiles: normalized });
}
