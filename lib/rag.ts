import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { embed } from "./embeddings";

/**
 * Pobierz top-k dokumentow z knowledge base ktore pasuja do zapytania.
 *
 * Zwraca string gotowy do wstawienia w system prompt:
 *   "KONTEKST:\n[doc1]...\n\n[doc2]..."
 *
 * Zwraca pusty string jezeli OPENAI_API_KEY nie jest skonfigurowane lub brak wynikow.
 */
export async function buildRagContext(
  supabase: SupabaseClient,
  args: {
    userId: string;
    projectId?: string;
    query: string;
    topK?: number;
    threshold?: number;
  },
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return "";
  if (!args.query.trim()) return "";

  try {
    const embedding = await embed(args.query);
    const { data } = await supabase.rpc("match_knowledge", {
      p_user_id: args.userId,
      p_project_id: args.projectId ?? null,
      query_embedding: embedding,
      match_threshold: args.threshold ?? 0.7,
      match_count: args.topK ?? 3,
    });

    if (!data || data.length === 0) return "";

    return (
      "\n\nKONTEKST Z TWOJEJ BAZY WIEDZY (uzyj jezeli pomocne):\n" +
      (data as Array<{ title: string; content: string }>)
        .map((d, i) => `[${i + 1}] ${d.title}\n${d.content}`)
        .join("\n\n")
    );
  } catch {
    return "";
  }
}
