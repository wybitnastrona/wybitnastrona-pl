import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { toFile } from "openai/uploads";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Transcribe audio (Whisper API).
 *
 * POST: multipart/form-data z polem `audio` (Blob).
 * Returns: { text: string }
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "Missing audio" }, { status: 400 });
  }

  // Limit 10 MB
  if (audio.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const file = await toFile(audio, "voice.webm", { type: audio.type || "audio/webm" });
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "pl",
    });
    return NextResponse.json({ text: transcription.text });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Whisper failed" },
      { status: 500 },
    );
  }
}
