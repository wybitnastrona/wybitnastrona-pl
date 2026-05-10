import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export const runtime = "nodejs";
export const maxDuration = 30;

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
