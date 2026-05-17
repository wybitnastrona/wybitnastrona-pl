"use client";

/**
 * @deprecated Zastapione przez `PlatformSelector` (segmented pill).
 * Komponent zachowany tymczasowo na wypadek odwrotu - bedzie usuniety po stabilizacji.
 */

import { Globe, Watch, Tv } from "lucide-react";
import { AppleIcon, AndroidIcon } from "@/components/brand-icons";
import { PROJECT_MODES, type ProjectMode } from "@/lib/project-modes";

type Props = {
  value: ProjectMode;
  onChange: (mode: ProjectMode) => void;
};

const ICONS: Record<ProjectMode, (props: { className?: string }) => React.ReactElement> = {
  ios: ({ className }) => <AppleIcon className={className} />,
  android: ({ className }) => <AndroidIcon className={className} />,
  web: ({ className }) => <Globe className={className} />,
  watchos: ({ className }) => <Watch className={className} />,
  tvos: ({ className }) => <Tv className={className} />,
  visionos: ({ className }) => <AppleIcon className={className} />,
};

export function ModeTabs({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-0.5 rounded-t-xl border-b border-beige/15 bg-background/30 px-3 pt-2">
      {PROJECT_MODES.map((mode) => {
        const Icon = ICONS[mode.id];
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
            title={mode.comingSoon ? "Wkrótce" : mode.label}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {mode.label}
            {mode.comingSoon && (
              <span className="ml-0.5 rounded bg-beige/15 px-1 py-px text-[8px] uppercase tracking-wider text-beige/80">
                Wkrótce
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
