"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileUp,
  Globe,
  ImageIcon,
  Lock,
  Loader2,
  Paperclip,
  Plus,
  Sparkles,
  Shuffle,
  X,
  Check,
} from "lucide-react";
import { DEFAULT_TEMPLATE, type TemplateId } from "@/lib/templates";
import { AI_MODELS, DEFAULT_MODEL_ID, type AiModelId } from "@/lib/ai-models";
import {
  PROJECT_MODES,
  DEFAULT_MODE,
  getModeById,
  type ProjectMode,
} from "@/lib/project-modes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlatformSelector } from "@/components/app-shell/platform-selector";
import { AdvancedControls } from "@/components/app-shell/advanced-controls";

type PendingFile = {
  name: string;
  type: "text" | "image";
  content: string;
  dataUrl?: string;
};

type CreationHeroProps = {
  /** Czy uzytkownik jest w planie FREE — wtedy pokazujemy tylko "Auto" model. */
  isFreeTier?: boolean;
};

export function CreationHero({ isFreeTier = true }: CreationHeroProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState("");
  const [projectMode, setProjectMode] = useState<ProjectMode>(DEFAULT_MODE);
  const [isPublic, setIsPublic] = useState(true);
  // Initial model: FREE tier zaczyna od pierwszego "isFree" modelu (Auto/Haiku).
  const initialModel: AiModelId = isFreeTier
    ? (AI_MODELS.find((m) => m.available && m.isFree)?.id ?? DEFAULT_MODEL_ID)
    : DEFAULT_MODEL_ID;
  const [model, setModel] = useState<AiModelId>(initialModel);
  const [template, setTemplate] = useState<TemplateId>(DEFAULT_TEMPLATE);
  const [customContext, setCustomContext] = useState("");
  const [isPlanMode, setIsPlanMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const currentModeDef = getModeById(projectMode);

  function handleModeChange(mode: ProjectMode) {
    setProjectMode(mode);
    const def = getModeById(mode);
    setTemplate(def.defaultTemplate as TemplateId);
  }

  function handleShuffle() {
    const suggestions = currentModeDef.suggestions;
    if (!suggestions.length) return;
    const random = suggestions[Math.floor(Math.random() * suggestions.length)];
    setPrompt(random.prompt);
    textareaRef.current?.focus();
  }

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 220)}px`;
  }, [prompt]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleGenerate();
  }

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed || submitting) return;

    let finalPrompt = trimmed;

    const textFiles = pendingFiles.filter((f) => f.type === "text");
    if (textFiles.length > 0) {
      finalPrompt +=
        "\n\n---\nZalaczone pliki:\n" +
        textFiles
          .map((f) => `### ${f.name}\n\`\`\`\n${f.content}\n\`\`\``)
          .join("\n\n");
    }

    const imageFiles = pendingFiles.filter((f) => f.type === "image");
    if (imageFiles.length > 0) {
      try {
        sessionStorage.setItem(
          "wybitna_attachments",
          JSON.stringify(imageFiles),
        );
      } catch {
        // sessionStorage unavailable — ignore
      }
    } else {
      sessionStorage.removeItem("wybitna_attachments");
    }

    const params = new URLSearchParams({
      prompt: finalPrompt,
      mode: isPlanMode ? "plan" : "build",
      projectMode,
    });
    if (template !== DEFAULT_TEMPLATE) params.set("template", template);
    params.set("model", model);
    if (isPublic) params.set("public", "1");
    const trimmedCtx = customContext.trim();
    if (trimmedCtx) params.set("ctx", trimmedCtx.slice(0, 2000));

    setSubmitting(true);
    router.push(`/project/new?${params.toString()}`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleGenerate();
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const processed: PendingFile[] = [];
    for (const file of files) {
      if (file.size > 2 * 1024 * 1024) continue;
      if (file.type.startsWith("image/")) {
        const dataUrl = await readAsDataUrl(file);
        processed.push({ name: file.name, type: "image", content: "", dataUrl });
      } else {
        const text = await file.text();
        processed.push({ name: file.name, type: "text", content: text });
      }
    }
    setPendingFiles((prev) => [...prev, ...processed]);
    if (event.target) event.target.value = "";
  }

  const selectedModel = AI_MODELS.find((m) => m.id === model) ?? AI_MODELS[0];

  return (
    <section className="relative flex flex-col items-center px-4 pt-16 pb-12 sm:pt-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(232,220,196,0.08),transparent)]" />

      <header className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
        <h1 className="text-balance text-4xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl">
          Zbuduj dowolna{" "}
          <span className="italic text-beige">aplikacje</span>{" "}
          w kilka minut
        </h1>
        <p className="max-w-lg text-balance text-base text-muted-foreground sm:text-lg">
          Opisz pomysl, AI buduje, ty publikujesz.
        </p>
      </header>

      <div className="mt-8 w-full max-w-2xl">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-beige/20 bg-card/80 shadow-2xl shadow-black/40 backdrop-blur transition focus-within:border-beige/60 focus-within:bg-card hover:border-beige/30"
        >
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            placeholder={currentModeDef.placeholder}
            className="block w-full resize-none bg-transparent px-4 pt-4 pb-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-lg"
            aria-label="Opisz swoja aplikacje lub strone"
          />

          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {pendingFiles.map((f, i) => (
                <span
                  key={`${f.name}-${i}`}
                  className="inline-flex items-center gap-1 rounded-md border border-beige/15 bg-beige/10 px-2 py-0.5 text-[11px] text-beige"
                >
                  {f.type === "image" ? (
                    <ImageIcon className="h-3 w-3" />
                  ) : (
                    <Paperclip className="h-3 w-3" />
                  )}
                  {f.name}
                  <button
                    type="button"
                    onClick={() =>
                      setPendingFiles((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="ml-0.5 cursor-pointer opacity-70 hover:opacity-100"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Bottom toolbar — Rork style */}
          <div className="flex flex-wrap items-center gap-1.5 px-3 pb-3 sm:px-4 sm:pb-4">
            <PlusMenu
              onAttachImage={() => fileInputRef.current?.click()}
              isPlanMode={isPlanMode}
              onTogglePlanMode={() => setIsPlanMode((v) => !v)}
              model={model}
              onModelChange={setModel}
              isFreeTier={isFreeTier}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.json,.csv,.png,.jpg,.jpeg,.webp,.gif"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            <PlatformSelector value={projectMode} onChange={handleModeChange} />

            {isPlanMode && (
              <span className="inline-flex h-7 items-center gap-1 rounded-md border border-beige/25 bg-beige/10 px-2 text-[11px] font-medium text-beige">
                Planowanie
              </span>
            )}

            <div className="ml-auto flex items-center gap-1.5">
              <VisibilityToggle isPublic={isPublic} onChange={setIsPublic} />

              <button
                type="button"
                onClick={handleShuffle}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-beige/15 bg-background/40 text-muted-foreground transition hover:border-beige/30 hover:text-foreground"
                title="Losowa sugestia"
              >
                <Shuffle className="h-3.5 w-3.5" />
              </button>

              <Button
                type="submit"
                size="sm"
                disabled={!prompt.trim() || submitting}
                className="bg-beige text-beige-foreground hover:bg-beige/90 disabled:bg-beige/40 disabled:text-beige-foreground/60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Zbuduj
              </Button>
            </div>
          </div>
        </form>

        {/* Selected model hint (FREE tier sees only "Auto") */}
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Model: <span className="text-foreground/80">{selectedModel.labelShort}</span>
          {isFreeTier && (
            <>
              {" • "}
              <span className="text-muted-foreground">FREE — odblokuj wiecej w planie Pro</span>
            </>
          )}
        </p>

        {/* Suggestion chips — per-mode */}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {currentModeDef.suggestions.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => {
                setPrompt(chip.prompt);
                textareaRef.current?.focus();
              }}
              className="inline-flex h-7 cursor-pointer items-center rounded-full border border-beige/15 bg-background/40 px-3 text-xs text-muted-foreground transition hover:border-beige/40 hover:text-foreground"
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="mt-3 px-1">
          <AdvancedControls
            model={model}
            onModelChange={setModel}
            templateId={template}
            customContext={customContext}
            onCustomContextChange={setCustomContext}
          />
        </div>
      </div>

      <div className="mt-8">
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-beige/10 bg-background/20 px-4 py-2 text-sm text-muted-foreground/60 transition"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Eksploruj galerie
        </button>
      </div>
    </section>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlusMenu({
  onAttachImage,
  isPlanMode,
  onTogglePlanMode,
  model,
  onModelChange,
  isFreeTier,
}: {
  onAttachImage: () => void;
  isPlanMode: boolean;
  onTogglePlanMode: () => void;
  model: AiModelId;
  onModelChange: (id: AiModelId) => void;
  isFreeTier: boolean;
}) {
  // FREE: tylko modele oznaczone `isFree`. PRO: wszystkie dostepne.
  const visibleModels = AI_MODELS.filter(
    (m) => m.available && (isFreeTier ? m.isFree : true),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-8 cursor-pointer items-center justify-center rounded-md border border-beige/15 bg-background/40 px-2 text-muted-foreground transition hover:border-beige/30 hover:bg-white/5 hover:text-beige"
        aria-label="Wiecej opcji"
      >
        <Plus className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-64">
        <DropdownMenuItem onClick={onAttachImage}>
          <FileUp className="h-3.5 w-3.5" />
          Zalacz zdjecie
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onTogglePlanMode}>
          {isPlanMode ? (
            <Check className="h-3.5 w-3.5 text-beige" />
          ) : (
            <span className="inline-block h-3.5 w-3.5" />
          )}
          <div className="flex flex-col">
            <span>{isPlanMode ? "Planowanie" : "Tworzenie"}</span>
            <span className="text-[10px] text-muted-foreground">
              {isPlanMode
                ? "AI najpierw pokaze plan przed kodem"
                : "AI od razu pisze kod"}
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Agent AI
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {visibleModels.map((m) => (
            <DropdownMenuItem
              key={m.id}
              onClick={() => onModelChange(m.id)}
              className={m.id === model ? "bg-beige/10 text-beige" : ""}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <div className="flex flex-col">
                <span>{m.labelShort}</span>
                <span className="text-[10px] text-muted-foreground">
                  {m.pointCost} kr / generacja
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        {isFreeTier && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
              Plan FREE — wiecej modeli w Pro.
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function VisibilityToggle({
  isPublic,
  onChange,
}: {
  isPublic: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-8 cursor-pointer items-center gap-1 rounded-md border border-beige/15 bg-background/40 px-2 text-xs text-foreground/80 transition hover:border-beige/30 hover:text-foreground"
        aria-label="Widocznosc projektu"
      >
        {isPublic ? (
          <Globe className="h-3.5 w-3.5 text-beige/70" />
        ) : (
          <Lock className="h-3.5 w-3.5 text-beige/70" />
        )}
        {isPublic ? "Publiczny" : "Prywatny"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-44">
        <DropdownMenuItem onClick={() => onChange(true)}>
          <Globe className="h-3.5 w-3.5" />
          Publiczny
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange(false)}>
          <Lock className="h-3.5 w-3.5" />
          Prywatny
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export { PROJECT_MODES };
