"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Paperclip, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { useState } from "react";

type PromptInputProps = {
  value: string;
  onValueChange: (value: string) => void;
};

export function PromptInput({ value, onValueChange }: PromptInputProps) {
  const router = useRouter();
  const { user, openAuth } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${newHeight}px`;
  }, [value]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleGenerate();
  }

  async function handleGenerate() {
    const trimmed = value.trim();
    if (!trimmed || submitting) return;

    const target = `/project/new?prompt=${encodeURIComponent(trimmed)}`;

    if (!user) {
      openAuth({
        mode: "signup",
        onSuccess: () => router.push(target),
      });
      return;
    }

    setSubmitting(true);
    router.push(target);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleGenerate();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="group relative w-full rounded-2xl border border-beige/20 bg-card/80 shadow-2xl shadow-black/40 backdrop-blur transition focus-within:border-beige/60 focus-within:bg-card hover:border-beige/30"
    >
      <div className="flex items-start gap-2 px-3 pt-3 sm:px-4 sm:pt-4">
        <button
          type="button"
          aria-label="Załącz plik"
          className="mt-1.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-white/5 hover:text-beige"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Describe your app..."
          className="flex-1 resize-none bg-transparent py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-lg"
          aria-label="Opisz swoją aplikację"
        />
      </div>

      <div className="flex items-center justify-between gap-2 px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-beige/70" />
          <span className="hidden sm:inline">
            Wciśnij Enter aby wygenerować • Shift+Enter dla nowej linii
          </span>
          <span className="sm:hidden">Wciśnij Generate</span>
        </div>

        <Button
          type="submit"
          disabled={!value.trim() || submitting}
          className="bg-beige text-beige-foreground hover:bg-beige/90 disabled:bg-beige/40 disabled:text-beige-foreground/60"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          Generate
        </Button>
      </div>
    </form>
  );
}
