import "server-only";

/**
 * AI Image Generator — DALL-E 3 z fallback do Picsum.
 *
 * Uzywane przez narzedzie `generateImage` w /api/generate/route.ts.
 * Buduje wzbogacony prompt z prefiksem stylu, wysyla do OpenAI,
 * zwraca { url, alt } gotowe do wstawienia w <img src="..."> przez AI.
 */

const DALLE_ENDPOINT = "https://api.openai.com/v1/images/generations";

const SIZE_MAP: Record<string, "1792x1024" | "1024x1792" | "1024x1024"> = {
  landscape: "1792x1024",
  portrait: "1024x1792",
  square: "1024x1024",
};

const STYLE_PREFIXES: Record<string, string> = {
  photography:
    "professional photograph, high quality, cinematic lighting, ",
  illustration:
    "clean vector illustration, flat design, minimal style, ",
  product:
    "professional product photography, studio lighting, clean white background, ",
};

export type GeneratedImage = {
  url: string;
  alt: string;
  source: "dalle3" | "picsum";
};

/**
 * Generuje tematyczne zdjecie przez DALL-E 3 lub Picsum jesli brak klucza API.
 */
export async function generateImageForAI(
  prompt: string,
  style: string = "photography",
  size: string = "landscape",
): Promise<GeneratedImage> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return picsum(prompt);
  }

  const prefix = STYLE_PREFIXES[style] ?? STYLE_PREFIXES.photography;
  const dallePrompt = `${prefix}${prompt}. No text overlays, no watermarks, no logos, no people with recognizable faces.`;
  const dalleSize = SIZE_MAP[size] ?? SIZE_MAP.landscape;

  try {
    const res = await fetch(DALLE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: dallePrompt,
        n: 1,
        size: dalleSize,
        quality: "standard",
        response_format: "url",
      }),
    });

    if (!res.ok) {
      console.warn("[image-generator] DALL-E error", res.status);
      return picsum(prompt);
    }

    const data = (await res.json()) as {
      data: Array<{ url: string; revised_prompt?: string }>;
    };

    const url = data.data?.[0]?.url;
    if (!url) return picsum(prompt);

    return { url, alt: prompt, source: "dalle3" };
  } catch (err) {
    console.error("[image-generator] network error", err);
    return picsum(prompt);
  }
}

function picsum(prompt: string): GeneratedImage {
  const seed = Math.abs(
    Array.from(prompt).reduce((acc, c) => acc + c.charCodeAt(0), 0),
  );
  return {
    url: `https://picsum.photos/seed/${seed}/1200/800`,
    alt: prompt,
    source: "picsum",
  };
}
