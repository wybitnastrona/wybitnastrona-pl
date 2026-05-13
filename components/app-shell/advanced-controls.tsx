"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, Settings2, Sparkles } from "lucide-react";
import { AI_MODELS, type AiModelId } from "@/lib/ai-models";
import { getTemplate, type TemplateId } from "@/lib/templates";

const MCP_STUBS = [
  { id: "supabase", label: "Supabase MCP", description: "Połącz agenta z bazą Supabase" },
  { id: "memory", label: "Memory MCP", description: "Włącz pamięć między sesjami" },
  { id: "stitch", label: "Stitch MCP", description: "Połącz z Google Stitch dla UI" },
  { id: "notion", label: "Notion MCP", description: "Połącz z Notion" },
] as const;

export const CUSTOM_CONTEXT_MAX = 2000;

type Props = {
  model: AiModelId;
  onModelChange: (id: AiModelId) => void;
  templateId: TemplateId;
  customContext: string;
  onCustomContextChange: (value: string) => void;
};

export function AdvancedControls({
  model,
  onModelChange,
  templateId,
  customContext,
  onCustomContextChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const tpl = getTemplate(templateId);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground/70"
      >
        <Settings2 className="h-3.5 w-3.5" />
        Advanced Controls
        {open ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-beige/15 bg-card/60 p-4 text-sm">
          {/* MCPs */}
          <div className="mb-4">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              Select MCPs to use
            </p>
            <div className="space-y-1.5">
              {MCP_STUBS.map((mcp) => (
                <div
                  key={mcp.id}
                  className="flex cursor-not-allowed items-center justify-between rounded-lg border border-beige/10 bg-background/30 px-3 py-2 opacity-50"
                  title="Wkrotce"
                >
                  <div>
                    <p className="text-xs font-medium text-foreground">{mcp.label}</p>
                    <p className="text-[10px] text-muted-foreground">{mcp.description}</p>
                  </div>
                  <span className="rounded bg-beige/10 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-beige/60">
                    Wkrotce
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom System Context */}
          <div className="mb-4">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <FileText className="h-3 w-3" />
              Custom System Context
            </p>
            <textarea
              value={customContext}
              onChange={(e) =>
                onCustomContextChange(e.target.value.slice(0, CUSTOM_CONTEXT_MAX))
              }
              rows={3}
              placeholder="Np: zawsze uzywaj kolorystyki czarno-bezowej; stylizuj w stylu Notion; nie dodawaj cookie bannerow..."
              className="block w-full resize-none rounded-lg border border-beige/10 bg-background/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-beige/40 focus:outline-none"
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground/70">
              <span>Doklejone do system promptu przy KAZDEJ generacji</span>
              <span>
                {customContext.length} / {CUSTOM_CONTEXT_MAX}
              </span>
            </div>
          </div>

          {/* Template / container image */}
          <div className="mb-4">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              Select Template
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-beige/10 bg-background/30 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-beige/60" />
              <span className="truncate text-xs text-foreground/80 font-mono">
                {tpl.containerImage}
              </span>
            </div>
          </div>

          {/* Model picker */}
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              Model
            </p>
            <div className="space-y-1">
              {AI_MODELS.filter((m) => m.available).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onModelChange(m.id)}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-left transition
                    ${m.id === model
                      ? "border-beige/40 bg-beige/5 text-foreground"
                      : "border-beige/10 bg-background/30 text-foreground/70 hover:border-beige/20 hover:text-foreground"
                    }`}
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-medium">
                      {m.label}
                      {m.badge && (
                        <span className="rounded bg-beige/15 px-1 text-[8px] uppercase tracking-wider text-beige">
                          {m.badge === "fast" ? "Szybki" : m.badge === "powerful" ? "Mocny" : "Nowy"}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {m.description}
                    </p>
                  </div>
                  <span className="ml-3 shrink-0 text-[10px] text-muted-foreground">
                    {m.pointCost} kr
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
