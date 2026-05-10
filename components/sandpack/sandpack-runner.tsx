"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { ProjectFiles } from "@/lib/types/project";

const SandpackInner = dynamic(
  () => import("./sandpack-inner").then((mod) => mod.SandpackInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-card text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    ),
  },
);

export type SandpackViewMode = "preview" | "code" | "split";

export type SandpackRunnerProps = {
  files: ProjectFiles;
  viewMode?: SandpackViewMode;
  /** Tryb wyboru elementu - aktywuje overlay nad podgladem. */
  selectMode?: boolean;
  /** Callback wywolywany gdy uzytkownik kliknie w preview w trybie select. */
  onElementPick?: (info: {
    x: number;
    y: number;
    selector?: string;
    html?: string;
    tagName?: string;
  }) => void;
  /** Wyrenderuj nadpisany URL bar - jezeli true, wewnetrzny navigator Sandpacka jest ukryty. */
  hideInternalNavigator?: boolean;
  /**
   * ID projektu — jezeli przekazane, SandpackSaver bedzie automatycznie
   * zapisywal reczne edycje uzytkownika do bazy (debounce 1.5s).
   */
  projectId?: string;
  /** When true the editor is read-only (AI is actively writing files). */
  isGenerating?: boolean;
  /**
   * Wywoływane z menu eksploratora („Wskaż w podglądzie”) — np. włącza tryb
   * wyboru elementu i przełącza na widok podglądu.
   */
  onRequestPreviewPickMode?: () => void;
  /**
   * Gdy true (zakładka „Podgląd”): zwęża eksplorator + edytor do zera, ale zostawia
   * je w DOM — żeby bundler Sandpacka nie przechodził w „idle”.
   */
  collapseChrome?: boolean;
};

export function SandpackRunner(props: SandpackRunnerProps) {
  return <SandpackInner {...props} />;
}
