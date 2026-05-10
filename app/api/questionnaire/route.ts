import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `Jesteś asystentem pomagającym tworzyć spersonalizowane strony internetowe.
Na podstawie promptu użytkownika wygenerujesz dokładnie 3 pytania w języku polskim.

Zasady:
- Pytania MUSZĄ być specyficzne dla opisanej strony/projektu — nie generyczne
- Pytanie 1 (id: "style", type: "single"): styl wizualny — 4 opcje pasujące do tej branży/projektu
- Pytanie 2 (id: "sections", type: "multi"): sekcje lub funkcje — 4-6 opcji konkretnych dla tego projektu
- Pytanie 3 (id: "content", type: "single"): treść — czy generować przykładowe dane czy zaznaczyć miejsca do uzupełnienia
- Wszystkie pytania i opcje MUSZĄ być w języku polskim
- Wartości (value) w snake_case po angielsku
- Opcje muszą być konkretne i przydatne dla opisanego projektu

Odpowiedz WYŁĄCZNIE poprawnym JSON bez żadnego dodatkowego tekstu, w formacie:
{
  "questions": [
    {
      "id": "style",
      "text": "...",
      "type": "single",
      "options": [
        { "value": "...", "label": "...", "description": "..." }
      ]
    }
  ]
}`;

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

  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      system: SYSTEM_PROMPT,
      prompt: `Projekt: ${prompt}`,
    });

    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]) as {
      questions?: Array<{
        id: string;
        text: string;
        type: "single" | "multi";
        options: Array<{ value: string; label: string; description?: string }>;
      }>;
    };

    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error("Invalid response shape");
    }

    // Validate each question has at least 2 options
    const valid = parsed.questions.filter(
      (q) => q.id && q.text && q.type && Array.isArray(q.options) && q.options.length >= 2,
    );
    if (valid.length === 0) throw new Error("No valid questions");

    return NextResponse.json({ questions: valid });
  } catch (err) {
    console.error("[questionnaire]", err);
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 });
  }
}
