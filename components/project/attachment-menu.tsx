"use client";

/**
 * Rozwijane menu pod przyciskiem "+" w czacie - wzorowane na Bolt.new.
 *
 * Sekcje:
 *  - ZAŁĄCZNIK: zdjęcie / plik
 *  - INTEGRACJE: Płatności (Stripe)
 *  - URZĄDZENIE: Media, Sensory, Pamięć itd. (Expo-like, po polsku)
 *  - AI: Analiza obrazu, generowanie tekstu, agenci (Sonnet 4.6 / Opus 4.7 / OpenAI)
 *
 * Po kliknięciu pozycji wywołujemy `onPickTool(tool)` w rodzicu - rodzic dorzuca
 * chip do `attachments`, który widzi AI w prompt jako "Narzędzia do uwzględnienia".
 */

import { useState } from "react";
import { Paperclip, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ATTACHMENT_TOOLS,
  CATEGORY_LABELS,
  type AttachmentTool,
  type AttachmentToolCategory,
} from "@/lib/attachment-tools";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  /** Klasyczny upload - input[type=file] u rodzica. */
  onPickFile: () => void;
  /** Dodanie chipu narzędzia. */
  onPickTool: (tool: AttachmentTool) => void;
  /** Stripe → otworzyć panel płatności w canvas (event globalny). */
  onOpenStripe?: () => void;
};

export function AttachmentMenu({ onPickFile, onPickTool, onOpenStripe }: Props) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<AttachmentToolCategory>(
    "attachment",
  );

  const grouped = ATTACHMENT_TOOLS.reduce<
    Record<AttachmentToolCategory, Record<string, AttachmentTool[]>>
  >(
    (acc, t) => {
      const cat = acc[t.category] ?? {};
      const sec = t.section ?? "_default";
      cat[sec] = [...(cat[sec] ?? []), t];
      acc[t.category] = cat;
      return acc;
    },
    { attachment: {}, integrations: {}, device: {}, ai: {} },
  );

  const sections = grouped[activeCategory];

  function handlePick(tool: AttachmentTool) {
    setOpen(false);
    if (tool.id === "attach-image") {
      onPickFile();
      return;
    }
    if (tool.id === "stripe" && onOpenStripe) {
      onOpenStripe();
      return;
    }
    onPickTool(tool);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/5 text-muted-foreground transition hover:bg-white/10 hover:text-beige"
        aria-label="Załącz lub dodaj narzędzie"
        title="Dodaj narzędzie / załącznik"
      >
        <Plus className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-[440px] overflow-hidden p-0"
      >
        <div className="grid grid-cols-[140px_1fr]">
          {/* Sidebar with categories */}
          <div className="flex flex-col gap-0.5 border-r border-beige/10 bg-background/50 p-2">
            {(Object.keys(CATEGORY_LABELS) as AttachmentToolCategory[]).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-[11px] font-medium uppercase tracking-wider transition ${
                    activeCategory === cat
                      ? "bg-beige/15 text-beige"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ),
            )}
          </div>

          {/* Right: tool list */}
          <div className="max-h-[360px] overflow-y-auto p-2">
            {Object.entries(sections).map(([section, items]) => (
              <div key={section} className="mb-2 last:mb-0">
                {section !== "_default" && (
                  <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {section}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-0.5">
                  {items.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handlePick(t)}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground/90 transition hover:bg-beige/10 hover:text-beige"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 text-beige/70" />
                        <span className="truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Resolve a tool icon from an attachment.type like `wybitna/device:camera`.
 * Falls back to Paperclip.
 */
export function getToolIconByAttachmentType(type: string): LucideIcon {
  const match = type.match(/^wybitna\/[^:]+:(.+)$/);
  if (!match) return Paperclip;
  const id = match[1];
  const tool = ATTACHMENT_TOOLS.find((t) => t.id === id);
  return tool?.icon ?? Paperclip;
}
