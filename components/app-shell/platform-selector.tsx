"use client";

/**
 * Rork-style platform selector.
 *
 * Pill w toolbarze pod textarea — pokazuje aktualnie wybrana platforme
 * (iOS / Android / Web) i otwiera dropdown z trzema opcjami.
 *
 * Aktualnie uzywany w `CreationHero` (ekran startowy).
 */

import { Globe, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppleIcon, AndroidIcon } from "@/components/brand-icons";
import {
  PROJECT_MODES,
  getModeById,
  type ProjectMode,
} from "@/lib/project-modes";

type Props = {
  value: ProjectMode;
  onChange: (mode: ProjectMode) => void;
};

const ICON_FOR_PLATFORM: Record<ProjectMode, (props: { className?: string }) => React.ReactElement> = {
  ios: ({ className }) => <AppleIcon className={className} />,
  android: ({ className }) => <AndroidIcon className={className} />,
  web: ({ className }) => <Globe className={className} />,
};

export function PlatformSelector({ value, onChange }: Props) {
  const current = getModeById(value);
  const CurrentIcon = ICON_FOR_PLATFORM[current.id as ProjectMode];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-beige/15 bg-background/40 px-2.5 text-xs text-foreground/85 transition hover:border-beige/30 hover:text-foreground"
        aria-label="Wybierz platforme"
      >
        <CurrentIcon className="h-3.5 w-3.5 text-beige/80" />
        {current.label}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-72">
        {PROJECT_MODES.map((mode) => {
          const Icon = ICON_FOR_PLATFORM[mode.id];
          const isActive = mode.id === value;
          return (
            <DropdownMenuItem
              key={mode.id}
              onClick={() => onChange(mode.id)}
              className={isActive ? "bg-beige/10 text-beige" : ""}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm">{mode.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {mode.stackHint}
                </span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
