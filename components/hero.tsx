"use client";

import { useState } from "react";
import { PromptInput } from "@/components/prompt-input";
import { SuggestionGrid } from "@/components/suggestion-grid";

export function Hero() {
  const [prompt, setPrompt] = useState("");

  return (
    <section className="relative flex flex-1 items-center justify-center overflow-hidden bg-radial-spotlight">
      <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(232,220,196,0.08),transparent)]" />

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="rounded-full border border-beige/20 bg-card/60 px-3 py-1 text-xs uppercase tracking-wider text-beige/80 backdrop-blur">
            AI Website Builder
          </span>
          <h1 className="text-balance text-4xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Co dzisiaj zbudujemy?
          </h1>
          <p className="max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            Opisz pomysł, a AI w kilka sekund wygeneruje wybitną stronę
            uruchomioną w bezpiecznym sandboxie.
          </p>
        </div>

        <PromptInput value={prompt} onValueChange={setPrompt} />

        <SuggestionGrid onSelect={setPrompt} />
      </div>
    </section>
  );
}
