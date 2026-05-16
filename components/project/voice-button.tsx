"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

type Props = {
  /** Wywolane gdy nagranie zakończy się i Whisper/SR zwroci transkrypcje. */
  onTranscript: (text: string) => void;
  className?: string;
  /** Wymus uzycie Web Speech API (free, ale gorsza jakosc). Domyslnie auto. */
  preferWebSpeech?: boolean;
};

type SpeechRecognitionType = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
};

interface SpeechRecognitionEvent extends Event {
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
    length: number;
  }>;
}

declare global {
  interface Window {
    SpeechRecognition?: { new (): SpeechRecognitionType };
    webkitSpeechRecognition?: { new (): SpeechRecognitionType };
  }
}

/**
 * Przycisk mikrofonu z dwustopniowa logika:
 *  1) Klik -> rozpoczyna nagrywanie (MediaRecorder).
 *  2) Drugi klik -> stop, wysyla audio do /api/transcribe (Whisper).
 *
 * Fallback: Web Speech API jeszcze nie zaimplementowane (Whisper jest dokladniejszy).
 */
export function VoiceButton({
  onTranscript,
  className = "",
  preferWebSpeech,
}: Props) {
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  useEffect(() => {
    return () => {
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  function getSpeechRecognition() {
    if (typeof window === "undefined") return null;
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    return Ctor ? new Ctor() : null;
  }

  async function startWebSpeech() {
    const recognition = getSpeechRecognition();
    if (!recognition) return false;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "pl-PL";

    recognition.onresult = (e) => {
      const text = Array.from(
        { length: e.results.length },
        (_, i) => e.results[i][0]?.transcript ?? "",
      ).join(" ");
      if (text.trim()) onTranscript(text.trim());
    };
    recognition.onerror = () => setState("idle");
    recognition.onend = () => setState("idle");

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setState("recording");
      return true;
    } catch {
      return false;
    }
  }

  async function startWhisper() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState("processing");
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        try {
          const fd = new FormData();
          fd.append("audio", blob, "voice.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          const data = (await res.json()) as { text?: string; error?: string };
          if (data.text) onTranscript(data.text);
          else if (data.error?.includes("OPENAI")) {
            // Fallback do Web Speech jezeli Whisper niedostepny
            const ok = await startWebSpeech();
            if (!ok) alert("Rozpoznawanie mowy niedostępne na tej przeglądarce");
          } else {
            alert(data.error ?? "Nie udało się rozpoznać mowy");
          }
        } catch {
          alert("Błąd transkrypcji");
        } finally {
          setState("idle");
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setState("recording");
    } catch {
      alert("Brak dostępu do mikrofonu");
    }
  }

  async function start() {
    if (preferWebSpeech) {
      const ok = await startWebSpeech();
      if (!ok) await startWhisper();
      return;
    }
    await startWhisper();
  }

  function stop() {
    recorderRef.current?.stop();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
  }

  function onClick() {
    if (state === "idle") start();
    else if (state === "recording") stop();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "processing"}
      title={
        state === "recording"
          ? "Zatrzymaj nagrywanie"
          : state === "processing"
            ? "Transkrypcja…"
            : "Dyktuj"
      }
      className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border transition disabled:opacity-50 ${
        state === "recording"
          ? "animate-pulse border-rose-400 bg-rose-500/20 text-rose-300"
          : "border-beige/15 bg-background/40 text-muted-foreground hover:border-beige/30 hover:text-foreground"
      } ${className}`}
    >
      {state === "processing" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : state === "recording" ? (
        <Square className="h-3.5 w-3.5" />
      ) : (
        <Mic className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
