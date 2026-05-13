import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/generate-image
 *
 * Generuje zdjecie tematyczne przez DALL-E 3 (OpenAI).
 * Uzywane przez narzedzie `generateImage` w systemie AI.
 *
 * Body: {
 *   prompt: string;   // Opisowy prompt po angielsku
 *   style?: string;   // "photography" | "illustration" | "product" (default: "photography")
 *   size?: "landscape" | "portrait" | "square";
 * }
 *
 * Response: { url: string; alt: string; revised_prompt?: string }
 *
 * ENV wymagane: OPENAI_API_KEY
 * Fallback (gdy brak klucza): Picsum deterministic placeholder.
 */

type GenerateImageBody = {
  prompt?: string;
  style?: string;
  size?: "landscape" | "portrait" | "square";
};

const SIZE_MAP: Record<string, "1792x1024" | "1024x1792" | "1024x1024"> = {
  landscape: "1792x1024",
  portrait: "1024x1792",
  square: "1024x1024",
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: GenerateImageBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = (body.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fallback do deterministycznego Picsum gdy brak klucza OpenAI.
    const seed = Math.abs(
      Array.from(prompt).reduce((acc, c) => acc + c.charCodeAt(0), 0),
    );
    return NextResponse.json({
      url: `https://picsum.photos/seed/${seed}/1200/800`,
      alt: prompt,
      source: "picsum_fallback",
    });
  }

  const dalleSize = SIZE_MAP[body.size ?? "landscape"];

  // Wzbogac prompt o styl i kontekst jakosci — DALL-E 3 lepiej rozumie szczegolowe opisy.
  const stylePrefix = body.style === "illustration"
    ? "clean vector illustration, flat design, "
    : body.style === "product"
      ? "product photography, clean background, professional studio, "
      : "professional photography, high quality, ";

  const enhancedPrompt = `${stylePrefix}${prompt}. Photorealistic, no text, no watermarks, no logos.`;

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: dalleSize,
        quality: "standard",
        response_format: "url",
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[generate-image] DALL-E error:", res.status, errorText);
      // Fallback do Picsum przy bledzie API.
      const seed = Math.abs(
        Array.from(prompt).reduce((acc, c) => acc + c.charCodeAt(0), 0),
      );
      return NextResponse.json({
        url: `https://picsum.photos/seed/${seed}/1200/800`,
        alt: prompt,
        source: "picsum_fallback_after_error",
      });
    }

    const data = (await res.json()) as {
      data: Array<{ url: string; revised_prompt?: string }>;
    };
    const img = data.data[0];
    if (!img?.url) {
      return NextResponse.json({ error: "No image returned" }, { status: 500 });
    }

    return NextResponse.json({
      url: img.url,
      alt: prompt,
      revised_prompt: img.revised_prompt,
      source: "dalle3",
    });
  } catch (err) {
    console.error("[generate-image] fetch error:", err);
    const seed = Math.abs(
      Array.from(prompt).reduce((acc, c) => acc + c.charCodeAt(0), 0),
    );
    return NextResponse.json({
      url: `https://picsum.photos/seed/${seed}/1200/800`,
      alt: prompt,
      source: "picsum_fallback_network_error",
    });
  }
}
