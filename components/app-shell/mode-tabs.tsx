"use client";

import { Layers, Smartphone, LayoutTemplate } from "lucide-react";
import { PROJECT_MODES, type ProjectMode } from "@/lib/project-modes";

type Props = {
  value: ProjectMode;
  onChange: (mode: ProjectMode) => void;
};

const ICONS = {
  layers: Layers,
  smartphone: Smartphone,
  "layout-template": LayoutTemplate,
} as const;

export function ModeTabs({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-0.5 rounded-t-xl border-b border-beige/15 bg-background/30 px-3 pt-2">
      {PROJECT_MODES.map((mode) => {
        const Icon = ICONS[mode.icon];
        const active = value === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            disabled={mode.comingSoon}
            onClick={() => !mode.comingSoon && onChange(mode.id)}
            className={`relative inline-flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-sm font-medium transition
              ${
                active
                  ? "border border-b-transparent border-beige/20 bg-card text-foreground -mb-px"
                  : "text-muted-foreground hover:text-foreground/70"
              }
              ${mode.comingSoon ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            title={mode.comingSoon ? "Wkrotce" : mode.label}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {mode.label}
            {mode.comingSoon && (
              <span className="ml-0.5 rounded bg-beige/15 px-1 py-px text-[8px] uppercase tracking-wider text-beige/80">
                Wkrotce
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
