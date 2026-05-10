import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

const MAX_LEN = 2000;

/** GET — returns the current custom_system_context for this project. */
export async function GET(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("projects")
    .select("custom_system_context")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json({
    customSystemContext: (data.custom_system_context as string | null) ?? "",
  });
}

/**
 * PATCH — updates custom_system_context. Body: { customSystemContext: string | null }
 * RLS owner_all guarantees only the project owner can write.
 */
export async function PATCH(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { customSystemContext?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body.customSystemContext;
  if (raw !== null && typeof raw !== "string") {
    return NextResponse.json(
      { error: "customSystemContext must be string or null" },
      { status: 400 },
    );
  }

  const normalized: string | null =
    raw === null || (typeof raw === "string" && raw.trim() === "")
      ? null
      : (raw as string).slice(0, MAX_LEN);

  const { error } = await supabase
    .from("projects")
    .update({ custom_system_context: normalized })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, customSystemContext: normalized ?? "" });
}
