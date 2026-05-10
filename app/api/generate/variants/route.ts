import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getModel,
  resolveAnthropicModel,
  type AiModelId,
  DEFAULT_MODEL_ID,
} from "@/lib/ai-models";
import type { ProjectFiles } from "@/lib/types/project";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Generuj 3 warianty kodu dla tego samego promptu, z roznymi temperature.
 * Uzytkownik wybiera najlepszy.
 *
 * Body: { projectId: string, prompt: string, model?: AiModelId }
 * Returns: { variants: [{ id, files, summary, temperature }] }
 *
 * UWAGA: kosztuje 3x punkty wzgledem zwyklego generowania.
 */

const TEMPERATURES = [0.3, 0.7, 1.0];

const VARIANT_PROMPT = `Jestes generatorem stron internetowych. Otrzymasz prompt uzytkownika.
Zwroc DOKLADNIE w formacie JSON:
{
  "summary": "krotki opis (1 zdanie)",
  "files": {
    "/App.tsx": "string z kodem React",
    "/components/Foo.tsx": "..."
  }
}
Tylko JSON, bez markdown. /index.tsx i /index.html sa juz zdefiniowane — NIE umieszczaj ich w files.`;

const variantSchema = z.object({
  summary: z.string(),
  files: z.record(z.string(), z.string()),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { projectId?: string; prompt?: string; model?: AiModelId };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt || !body.projectId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Sprawdz punkty (3x koszt)
  const modelId = body.model ?? DEFAULT_MODEL_ID;
  const modelDef = getModel(modelId);
  const cost = modelDef.pointCost * 3;

  const { data: profile } = await supabase
    .from("profiles")
    .select("points")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.points < cost) {
    return NextResponse.json(
      { error: "Insufficient points", required: cost, balance: profile?.points ?? 0 },
      { status: 402 },
    );
  }

  type Variant = {
    id: string;
    temperature: number;
    summary: string;
    files: ProjectFiles;
  };

  // Generuj 3 warianty rownolegle
  const anthropicModel = resolveAnthropicModel(modelId);
  const results = await Promise.allSettled(
    TEMPERATURES.map(async (temperature): Promise<Variant | null> => {
      const { text } = await generateText({
        model: anthropic(anthropicModel),
        system: VARIANT_PROMPT,
        prompt,
        temperature,
      });
      let parsed: unknown;
      try {
        parsed = JSON.parse(
          text.replace(/^```json\n?/, "").replace(/\n?```$/, ""),
        );
      } catch {
        return null;
      }
      const valid = variantSchema.safeParse(parsed);
      if (!valid.success) return null;
      const files: ProjectFiles = {};
      for (const [path, code] of Object.entries(valid.data.files)) {
        const norm = path.startsWith("/") ? path : `/${path}`;
        files[norm] = { code };
      }
      return {
        id: crypto.randomUUID(),
        temperature,
        summary: valid.data.summary,
        files,
      };
    }),
  );

  const variants: Variant[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) variants.push(r.value);
  }

  if (variants.length === 0) {
    return NextResponse.json({ error: "Wszystkie warianty failed" }, { status: 500 });
  }

  // Pobierz punkty (3x koszt — naliczamy raz po sukcesie)
  await supabase.rpc("deduct_points", {
    p_user_id: user.id,
    amount: cost,
  });

  return NextResponse.json({ variants });
}
