import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { embed, chunkText } from "@/lib/embeddings";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Lista dokumentow knowledge base usera.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  let query = supabase
    .from("knowledge_docs")
    .select("id, title, source, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ docs: data ?? [] });
}

/**
 * Dodaj dokument do KB. Body: { title, content, projectId? }.
 * Tekst jest dzielony na chunki, kazdy chunk = osobny rekord z embeddingiem.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title?: string; content?: string; projectId?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = body.title?.trim();
  const content = body.content?.trim();
  if (!title || !content) {
    return NextResponse.json({ error: "Missing title or content" }, { status: 400 });
  }
  if (content.length > 200_000) {
    return NextResponse.json({ error: "Content too large (max 200k chars)" }, { status: 413 });
  }

  const chunks = chunkText(content);
  const rows = await Promise.all(
    chunks.map(async (chunk, idx) => {
      const embedding = await embed(chunk);
      return {
        user_id: user.id,
        project_id: body.projectId ?? null,
        title: chunks.length > 1 ? `${title} (cz. ${idx + 1}/${chunks.length})` : title,
        content: chunk,
        embedding,
        source: body.source ?? null,
      };
    }),
  );

  const { error } = await supabase.from("knowledge_docs").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, chunks: rows.length });
}

/**
 * Usun dokument z KB.
 */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase
    .from("knowledge_docs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
