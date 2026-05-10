"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  Database,
  FileUp,
  ImageIcon,
  Layers,
  Lightbulb,
  Loader2,
  Paperclip,
  Plug,
  Plus,
  Rocket,
  Sparkles,
  X,
  Wrench,
} from "lucide-react";
import { TEMPLATES, DEFAULT_TEMPLATE, type TemplateId } from "@/lib/templates";
import { AI_MODELS, DEFAULT_MODEL_ID, type AiModelId } from "@/lib/ai-models";
import { FigmaIcon, GithubIcon } from "@/components/brand-icons";
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
import { useSettings } from "@/components/settings/settings-provider";

type Mode = "build" | "plan";

type PendingFile = {
  name: string;
  type: "text" | "image";
  content: string;
  dataUrl?: string;
};

const SUGGESTION_CHIPS = [
  { label: "Landing page dla trenera", prompt: "Landing page dla trenera personalnego" },
  { label: "Sklep z odzieżą", prompt: "Sklep internetowy z odzieżą sportową z katalogiem, koszykiem i checkoutem" },
  { label: "Portfolio fotografa", prompt: "Portfolio fotografa z galerią zdjęć i formularzem kontaktowym" },
  { label: "Dashboard SaaS", prompt: "Dashboard aplikacji SaaS z wykresami, tabelą użytkowników i statystykami" },
  { label: "Blog kulinarny", prompt: "Blog kulinarny z listą przepisów, kategoriami i formularzem komentarzy" },
  { label: "Strona restauracji", prompt: "Strona restauracji z menu, galerią, rezerwacją stolika i mapą dojazdu" },
];

export function CreationHero() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<Mode>("build");
  const [model, setModel] = useState<AiModelId>(DEFAULT_MODEL_ID);
  const [template, setTemplate] = useState<TemplateId>(DEFAULT_TEMPLATE);
  const [submitting, setSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

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

    // Append text file contents to prompt
    const textFiles = pendingFiles.filter((f) => f.type === "text");
    if (textFiles.length > 0) {
      finalPrompt +=
        "\n\n---\nZałączone pliki:\n" +
        textFiles
          .map((f) => `### ${f.name}\n\`\`\`\n${f.content}\n\`\`\``)
          .join("\n\n");
    }

    // Store image attachments in sessionStorage for ChatPanel to pick up
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

    const params = new URLSearchParams({ prompt: finalPrompt, mode });
    if (template !== DEFAULT_TEMPLATE) params.set("template", template);
    params.set("model", model);

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
      if (file.size > 2 * 1024 * 1024) continue; // skip > 2 MB
      if (file.type.startsWith("image/")) {
        const dataUrl = await readAsDataUrl(file);
        processed.push({ name: file.name, type: "image", content: "", dataUrl });
      } else {
        const text = await file.text();
        processed.push({ name: file.name, type: "text", content: text });
      }
    }
    setPendingFiles((prev) => [...prev, ...processed]);
    // reset so same file can be selected again
    if (event.target) event.target.value = "";
  }

  const selectedModel = AI_MODELS.find((m) => m.id === model) ?? AI_MODELS[0];
  const tpl = TEMPLATES.find((t) => t.id === template) ?? TEMPLATES[0];

  return (
    <section className="relative flex flex-col items-center px-4 pt-16 pb-12 sm:pt-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(232,220,196,0.08),transparent)]" />

      <header className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
        <h1 className="text-balance text-4xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Co dzisiaj <span className="italic text-beige">zbudujemy</span>?
        </h1>
        <p className="max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
          Opisz pomysl, a AI zbuduje wybitna strone w kilka sekund.
        </p>
      </header>

      {/* Suggestion chips */}
      <div className="mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
        {SUGGESTION_CHIPS.map((chip) => (
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

      <form
        onSubmit={handleSubmit}
        className="mt-4 w-full max-w-2xl rounded-2xl border border-beige/20 bg-card/80 shadow-2xl shadow-black/40 backdrop-blur transition focus-within:border-beige/60 focus-within:bg-card hover:border-beige/30"
      >
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Stworzmy strone internetowa..."
          className="block w-full resize-none bg-transparent px-4 pt-4 pb-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-lg"
          aria-label="Opisz swoja aplikacje"
        />

        {/* Pending file pills */}
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

        <div className="flex flex-wrap items-center gap-1.5 px-3 pb-3 sm:px-4 sm:pb-4">
          <PlusMenu onAttachFile={() => fileInputRef.current?.click()} />

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.json,.csv,.png,.jpg,.jpeg,.webp,.gif"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Model selector */}
          <Selector
            icon={Sparkles}
            label={selectedModel.labelShort}
            ariaLabel="Wybierz model"
          >
            <DropdownMenuLabel className="px-2 py-1 text-xs uppercase tracking-wider text-muted-foreground">
              Anthropic Claude
            </DropdownMenuLabel>
            {AI_MODELS.map((m) => (
              <DropdownMenuItem
                key={m.id}
                disabled={!m.available}
                onClick={() => m.available && setModel(m.id)}
                className={m.id === model ? "bg-beige/10 text-beige" : ""}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1.5">
                    {m.label}
                    {m.badge && (
                      <span className="rounded bg-beige/15 px-1 text-[8px] uppercase tracking-wider text-beige">
                        {m.badge === "fast" ? "Szybki" : m.badge === "powerful" ? "Mocny" : "Nowy"}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {m.description}
                  </span>
                </div>
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                  {m.pointCost} pkt
                </span>
              </DropdownMenuItem>
            ))}
          </Selector>

          {/* Framework selector */}
          <Selector
            icon={Layers}
            label={tpl.label}
            ariaLabel="Wybierz framework"
          >
            <DropdownMenuLabel className="px-2 py-1 text-xs uppercase tracking-wider text-muted-foreground">
              Framework
            </DropdownMenuLabel>
            {TEMPLATES.map((t) => (
              <DropdownMenuItem
                key={t.id}
                disabled={!t.available}
                onClick={() => t.available && setTemplate(t.id)}
                className={t.id === template ? "bg-beige/10 text-beige" : ""}
              >
                <div className="flex flex-col">
                  <span className="flex items-center gap-1.5">
                    {t.label}
                    {t.badge && (
                      <span
                        className={`rounded px-1 text-[8px] uppercase ${
                          t.badge === "new"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {t.badge}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {t.description}
                  </span>
                </div>
                {!t.available && (
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    Wkrótce
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </Selector>

          <div className="ml-auto flex items-center gap-1.5">
            <ModeToggle mode={mode} onChange={setMode} />
            <Button
              type="submit"
              size="sm"
              disabled={!prompt.trim() || submitting}
              className="bg-beige text-beige-foreground hover:bg-beige/90 disabled:bg-beige/40 disabled:text-beige-foreground/60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "plan" ? (
                <Wrench className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {mode === "plan" ? "Wygeneruj plan" : "Zbuduj"}
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        <span>lub zacznij od</span>
        <StartFromPill icon={FigmaIcon} label="Figma" />
        <StartFromPill icon={GithubIcon} label="GitHub" />
        <StartFromPill icon={FileUp} label="Szablon zespolu" />
      </div>
    </section>
  );
}

function PlusMenu({ onAttachFile }: { onAttachFile: () => void }) {
  const settings = useSettings();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-8 cursor-pointer items-center justify-center rounded-md border border-beige/15 bg-background/40 px-2 text-muted-foreground transition hover:border-beige/30 hover:bg-white/5 hover:text-beige"
        aria-label="Dodaj zalacznik lub kontekst"
      >
        <Plus className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-56">
        <DropdownMenuItem onClick={onAttachFile}>
          <FileUp className="h-3.5 w-3.5" />
          Zalącz plik
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <FigmaIcon className="h-3.5 w-3.5" />
          Importuj z Figmy
          <span className="ml-auto text-[10px] text-muted-foreground">
            Wkrótce
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => settings.open("knowledge")}>
          <Lightbulb className="h-3.5 w-3.5" />
          Wzmocnij prompt
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => settings.open("applications")}>
          <Database className="h-3.5 w-3.5" />
          Baza danych
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => settings.open("connectors")}>
          <Plug className="h-3.5 w-3.5" />
          Konektory
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Selector({
  icon: Icon,
  label,
  ariaLabel,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-8 cursor-pointer items-center gap-1 rounded-md border border-beige/15 bg-background/40 px-2 text-xs text-foreground/80 transition hover:border-beige/30 hover:bg-white/5 hover:text-foreground"
        aria-label={ariaLabel}
      >
        <Icon className="h-3.5 w-3.5 text-beige/70" />
        <span>{label}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-64">
        <DropdownMenuGroup>{children}</DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(mode === "plan" ? "build" : "plan")}
      className={`flex h-8 cursor-pointer items-center gap-1 rounded-md border px-2 text-xs transition ${
        mode === "plan"
          ? "border-beige/40 bg-beige/10 text-beige"
          : "border-beige/15 bg-background/40 text-muted-foreground hover:border-beige/30 hover:text-foreground"
      }`}
      aria-pressed={mode === "plan"}
    >
      {mode === "plan" ? (
        <Wrench className="h-3.5 w-3.5" />
      ) : (
        <Rocket className="h-3.5 w-3.5" />
      )}
      Plan
    </button>
  );
}

function StartFromPill({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex h-7 cursor-not-allowed items-center gap-1.5 rounded-full border border-beige/15 bg-background/40 px-2.5 text-xs text-muted-foreground/80"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
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
