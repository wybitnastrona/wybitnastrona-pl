import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

const ALLOWED_TYPES = [
  "view",
  "prompt",
  "publish",
  "remix",
  "edit",
  "export",
  "error",
] as const;
type EventType = (typeof ALLOWED_TYPES)[number];

/**
 * Loguje event analytics. Bez autoryzacji (publiczny endpoint do trackingu).
 */
export async function POST(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let body: { type?: string; metadata?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(body.type as EventType)) {
    return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
  }

  const ipHeader = req.headers.get("x-forwarded-for") ?? "";
  const ipHash = ipHeader
    ? Buffer.from(ipHeader.split(",")[0].trim()).toString("base64").slice(0, 16)
    : null;

  await supabase.from("project_events").insert({
    project_id: id,
    event_type: body.type,
    metadata: body.metadata ?? null,
    user_id: user?.id ?? null,
    ip_hash: ipHash,
    user_agent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
  });

  return NextResponse.json({ ok: true });
}

