import "server-only";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (_openai) return _openai;
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");
  _openai = new OpenAI({ apiKey: key });
  return _openai;
}

/**
 * Generuje wektor embedding dla tekstu uzywajac OpenAI text-embedding-3-small.
 * Output: 1536-wymiarowy vector (zgodny z migracja knowledge_docs).
 */
export async function embed(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000),
  });
  return res.data[0].embedding;
}

/**
 * Dziel dlugi tekst na chunki ~1000 znakow z 100-znakowym overlapem.
 */
export function chunkText(text: string, size = 1000, overlap = 100): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}
