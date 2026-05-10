import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const QuestionSchema = z.object({
  questions: z
    .array(
      z.object({
        id: z.string().describe("Unique snake_case identifier"),
        text: z.string().describe("Question text in Polish"),
        type: z.enum(["single", "multi"]),
        options: z
          .array(
            z.object({
              value: z.string().describe("Unique snake_case option value"),
              label: z.string().describe("Short option label in Polish"),
              description: z
                .string()
                .optional()
                .describe("One sentence description in Polish"),
            }),
          )
          .min(2)
          .max(6),
      }),
    )
    .min(2)
    .max(4),
});

const SYSTEM_PROMPT = `Jesteś asystentem pomagającym tworzyć spersonalizowane strony internetowe.
Na podstawie promptu użytkownika generujesz dokładnie 3 pytania w języku polskim, które pomogą 
sprecyzować wymagania dotyczące tworzonej strony.

Zasady:
- Pytania MUSZĄ być specyficzne dla opisanej strony/projektu — nie generyczne
- Pierwsze pytanie: zawsze o styl wizualny (4 opcje dostosowane do branży)
- Drugie pytanie: o sekcje/funkcje strony (multi-select, 4-6 opcji pasujących do projektu)
- Trzecie pytanie: o treść — czy generować przykładowe dane czy zaznaczyć miejsca do uzupełnienia
- Wszystkie pytania i opcje w języku polskim
- Wartości (value) w snake_case po angielsku
- Opcje powinny być konkretne i przydatne dla danego projektu`;

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
    const result = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      system: SYSTEM_PROMPT,
      prompt: `Wygeneruj 3 pytania dla tego projektu:\n\n${prompt}`,
      schema: QuestionSchema,
    });

    return NextResponse.json(result.object);
  } catch (err) {
    console.error("[questionnaire]", err);
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 });
  }
}
