"use client";

/**
 * Rork-style platform selector.
 *
 * Pill w toolbarze pod textarea — pokazuje aktualnie wybrana platforme
 * i otwiera dropdown z dostepnymi platformami zgodnie z tierem uzytkownika.
 *
 * Free   -> Web
 * Pro    -> Web + Android + iOS
 * Wybitny -> wszystko + Apple Watch / TV / Vision Pro
 */

import { Globe, ChevronDown, Watch, Tv, Lock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppleIcon, AndroidIcon } from "@/components/brand-icons";
import {
  PROJECT_MODES,
  getModeById,
  type ProjectMode,
} from "@/lib/project-modes";
import { tierAllows, type UserTier } from "@/lib/ai-models";

type Props = {
  value: ProjectMode;
  onChange: (mode: ProjectMode) => void;
  /** Tier zalogowanego uzytkownika — sluzy do gatingu platform Apple Pro+. */
  userTier?: UserTier;
};

type IconKey = "apple" | "android" | "globe" | "watch" | "tv" | "vision";

const ICON_FOR_KEY: Record<
  IconKey,
  (props: { className?: string }) => React.ReactElement
> = {
  apple: ({ className }) => <AppleIcon className={className} />,
  android: ({ className }) => <AndroidIcon className={className} />,
  globe: ({ className }) => <Globe className={className} />,
  watch: ({ className }) => <Watch className={className} />,
  tv: ({ className }) => <Tv className={className} />,
  // Lucide nie ma Vision Pro icon — uzywamy stylizowanego Apple (Vision Pro to Apple).
  vision: ({ className }) => <AppleIcon className={className} />,
};

export function PlatformSelector({ value, onChange, userTier = "free" }: Props) {
  const current = getModeById(value);
  const CurrentIcon = ICON_FOR_KEY[current.icon];

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
      <DropdownMenuContent align="start" sideOffset={8} className="w-80">
        {/* Base UI wymaga GroupLabel wewnątrz Group */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Standard
          </DropdownMenuLabel>
          {PROJECT_MODES.filter((m) => m.requiresTier !== "wybitny").map((mode) =>
            renderItem(mode, value, onChange, userTier),
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-beige">
            WYBITNY — Pełne Apple
          </DropdownMenuLabel>
          {PROJECT_MODES.filter((m) => m.requiresTier === "wybitny").map((mode) =>
            renderItem(mode, value, onChange, userTier),
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function renderItem(
  mode: (typeof PROJECT_MODES)[number],
  value: ProjectMode,
  onChange: (mode: ProjectMode) => void,
  userTier: UserTier,
) {
  const Icon = ICON_FOR_KEY[mode.icon];
  const isActive = mode.id === value;
  const allowed = tierAllows(userTier, mode.requiresTier);

  return (
    <DropdownMenuItem
      key={mode.id}
      onClick={() => allowed && onChange(mode.id)}
      disabled={!allowed}
      className={isActive ? "bg-beige/10 text-beige" : ""}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-sm">
          {mode.label}
          {!allowed && (
            <span className="inline-flex items-center gap-1 rounded bg-beige/10 px-1 py-0.5 text-[9px] uppercase tracking-wider text-beige/70">
              <Lock className="h-2.5 w-2.5" />
              {mode.requiresTier === "wybitny" ? "Wybitny" : "Pro"}
            </span>
          )}
        </span>
        <span className="truncate text-[10px] text-muted-foreground">
          {mode.stackHint}
        </span>
      </div>
    </DropdownMenuItem>
  );
}
