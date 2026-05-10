import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// Soft per-user rate limit (in-memory, best-effort). Chroni przed klikaniem
// "Ulepsz" 100 razy w sekundę. Nie zastapuje kontroli kosztow Anthropic, ale
// blokuje najprostsze naduzycia.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_HITS = 12;
const userHits = new Map<string, number[]>();

const SYSTEM_PROMPT = `Jestes asystentem ulepszajacym prompty do generatora stron internetowych.
Przeksztalcasz krotki, ogolny prompt uzytkownika w bardziej szczegolowy, konkretny prompt
ktory pozwoli AI zbudowac lepsza strone.

Zasady:
- Dodaj konkretne sekcje strony (Hero, O nas, Cennik itd.) dopasowane do tematu
- Zaproponuj styl wizualny (kolory, typografia, mood)
- Dodaj sugestie tresci i CTA gdzie to ma sens
- Zachowaj intencje uzytkownika — nie zmieniaj branzy ani celu
- Maks 4-6 zdan, bez zbednego rozwadniania
- Pisz po polsku
- NIE dodawaj wstepu typu "Oto ulepszony prompt:" — zwroc tylko sam prompt`;

export async function POST(req: Request) {
  // Autoryzacja — bez tego ktokolwiek z internetu moglby palic nasze tokeny Claude.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit per user.
  const now = Date.now();
  const hits = (userHits.get(user.id) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (hits.length >= RATE_LIMIT_MAX_HITS) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Sprobuj za chwile." },
      { status: 429 },
    );
  }
  hits.push(now);
  userHits.set(user.id, hits);

  let prompt: string;
  try {
    const body = (await req.json()) as { prompt?: string };
    prompt = body.prompt?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }
  if (prompt.length > 2000) {
    return NextResponse.json(
      { error: "Prompt too long (max 2000 chars)" },
      { status: 400 },
    );
  }

  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      system: SYSTEM_PROMPT,
      prompt: `Oryginalny prompt uzytkownika:\n${prompt}\n\nZwroc ulepszony prompt:`,
    });
    return NextResponse.json({ enhanced: text.trim() });
  } catch (err) {
    console.error("[enhance-prompt]", err);
    return NextResponse.json(
      { error: "Failed to enhance prompt" },
      { status: 500 },
    );
  }
}
