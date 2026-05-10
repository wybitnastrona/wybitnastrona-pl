import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listChatMessages, replaceChatMessages } from "@/lib/projects";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messages = await listChatMessages(id);
  return NextResponse.json({ messages });
}

/**
 * PUT body:
 *   { messages: [{ role, parts }] }
 *
 * Calkowicie nadpisuje historie wiadomosci dla projektu.
 * Wywolywany przez ChatPanel po zakonczeniu generowania (onFinish),
 * zeby snapshot stanu czatu byl zsynchronizowany z baza.
 */
export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Sprawdz wlasnosc projektu.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { messages?: Array<{ role: string; parts: unknown[] }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const msgs = (body.messages ?? []).filter(
    (m) => m.role === "user" || m.role === "assistant" || m.role === "system",
  ) as Array<{ role: "user" | "assistant" | "system"; parts: unknown[] }>;

  await replaceChatMessages(id, msgs);
  return NextResponse.json({ ok: true });
}
