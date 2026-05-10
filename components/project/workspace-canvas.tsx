"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Code2,
  Database,
  ExternalLink,
  Eye,
  History,
  Loader2,
  RotateCw,
  SquareTerminal,
} from "lucide-react";
import { SandpackRunner } from "@/components/sandpack/sandpack-runner";
import { DatabasePanel } from "@/components/project/database-panel";
import { SnapshotPanel } from "@/components/project/snapshot-panel";
import { ErrorWatcher } from "@/components/project/error-watcher";
import { TEMPLATES } from "@/lib/templates";
import type { Project } from "@/lib/types/project";
import type { SandpackViewMode } from "@/components/sandpack/sandpack-runner";

// Lazy/dynamic importy — izolują błędy WC (brak COOP/COEP, @webcontainer/api)
// od reszty workspace. Jeśli WC nie załaduje się, Sandpack nadal działa.
const WCRuntime = dynamic(
  () => import("@/components/webcontainer/wc-runtime").then((m) => m.WCRuntime),
  { ssr: false, loading: () => <WCLoader /> },
);
const WCTerminal = dynamic(
  () => import("@/components/webcontainer/wc-terminal").then((m) => m.WCTerminal),
  { ssr: false, loading: () => <WCLoader /> },
);

function WCLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a] text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Inicjalizacja WebContainerów…
    </div>
  );
}

type WorkspaceView = "preview" | "code" | "database" | "snapshots" | "terminal";

type Props = {
  project: Project;
  publishDomain: string;
  selectMode: boolean;
  onElementPick: (info: {
    x: number;
    y: number;
    selector?: string;
    html?: string;
    tagName?: string;
  }) => void;
  /** Callback gdy uzytkownik klika 'Napraw przez AI' przy bledzie iframe. */
  onFixError?: (hint: string) => void;
};

export function WorkspaceCanvas({
  project,
  publishDomain,
  selectMode,
  onElementPick,
  onFixError,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<WorkspaceView>("preview");
  const [opening, setOpening] = useState(false);

  const templateDef = TEMPLATES.find((t) => t.id === (project.template ?? "react-ts"));
  // Fail-safe: jeśli template nieznany lub nie ma flagi webContainerOnly → Sandpack
  const useWC = templateDef?.webContainerOnly === true;

  const sandpackMode: SandpackViewMode =
    view === "code" ? "code" : "preview";

  async function handleOpenLive() {
    setOpening(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/publish`, {
        method: "POST",
      });
      if (res.ok) {
        const data = (await res.json()) as { url?: string };
        if (data.url) {
          window.open(data.url, "_blank", "noopener");
        }
        router.refresh();
      }
    } finally {
      setOpening(false);
    }
  }

  const liveSlug = project.slug;
  const liveUrl =
    liveSlug && project.is_public
      ? buildSubdomainUrl(liveSlug, publishDomain)
      : null;

  const isSandpackView = view === "preview" || view === "code";

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <CanvasTopbar
        view={view}
        onViewChange={setView}
        onOpenLive={handleOpenLive}
        opening={opening}
        liveUrl={liveUrl}
        publishDomain={publishDomain}
        useWC={useWC}
      />

      <div className="relative min-h-0 flex-1">
        {useWC ? (
          <>
            {/* WebContainer runtime — zawsze zamontowany, ukrywany przez CSS */}
            <div className={view === "preview" ? "h-full" : "hidden h-full"}>
              <WCRuntime
                files={project.files}
                runCommand={templateDef?.runCommand}
              />
            </div>
            <div className={view === "terminal" ? "h-full" : "hidden h-full"}>
              <WCTerminal />
            </div>
          </>
        ) : (
          /* Sandpack — zawsze zamontowany, przelacznik Code/Preview to props,
             nie remount, dzieki czemu nie traci stanu kompilacji. */
          <div className={isSandpackView ? "h-full" : "hidden h-full"}>
            <SandpackRunner
              files={project.files}
              viewMode={sandpackMode}
              selectMode={view === "preview" && selectMode}
              onElementPick={onElementPick}
              projectId={project.id}
            />
          </div>
        )}

        {view === "database" && <DatabasePanel project={project} />}

        {view === "snapshots" && (
          <SnapshotPanel
            projectId={project.id}
            currentFiles={project.files}
            onRestored={() => {
              router.refresh();
              setView("preview");
            }}
          />
        )}

        {view === "preview" && onFixError && (
          <ErrorWatcher onFixRequest={onFixError} />
        )}
      </div>
    </div>
  );
}

function buildSubdomainUrl(slug: string, domain: string) {
  const protocol = domain.includes("localhost") ? "http" : "https";
  return `${protocol}://${slug}.${domain}`;
}

function CanvasTopbar({
  view,
  onViewChange,
  onOpenLive,
  opening,
  liveUrl,
  publishDomain,
  useWC,
}: {
  view: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  onOpenLive: () => void;
  opening: boolean;
  liveUrl: string | null;
  publishDomain: string;
  useWC: boolean;
}) {
  const displayUrl = liveUrl ?? `https://projekt.${publishDomain}`;

  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-beige/10 bg-background/80 px-2">
      {/* Glowne przelaczniki widoku — Podglad / Kod (tylko Sandpack) */}
      <div className="flex items-center gap-0.5 rounded-md border border-beige/15 bg-card/40 p-0.5">
        <ToggleButton
          icon={Eye}
          label="Podgląd"
          active={view === "preview"}
          onClick={() => onViewChange("preview")}
        />
        {!useWC && (
          <ToggleButton
            icon={Code2}
            label="Kod"
            active={view === "code"}
            onClick={() => onViewChange("code")}
          />
        )}
        {useWC && (
          <ToggleButton
            icon={SquareTerminal}
            label="Terminal"
            active={view === "terminal"}
            onClick={() => onViewChange("terminal")}
          />
        )}
      </div>

      {/* Dodatkowe panele — Baza / Historia */}
      <div className="flex items-center gap-0.5 rounded-md border border-beige/15 bg-card/40 p-0.5">
        <ToggleButton
          icon={Database}
          label="Baza"
          active={view === "database"}
          onClick={() => onViewChange("database")}
        />
        <ToggleButton
          icon={History}
          label="Historia"
          active={view === "snapshots"}
          onClick={() => onViewChange("snapshots")}
        />
      </div>

      <div className="mx-1 hidden h-7 flex-1 items-center gap-2 rounded-md border border-beige/15 bg-card/40 px-2 text-xs text-muted-foreground sm:flex">
        <span className="truncate font-mono">{displayUrl}</span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="ml-auto flex h-5 w-5 cursor-pointer items-center justify-center rounded text-muted-foreground transition hover:bg-white/5 hover:text-beige"
          aria-label="Odśwież podgląd"
        >
          <RotateCw className="h-3 w-3" />
        </button>
      </div>

      <button
        type="button"
        onClick={onOpenLive}
        disabled={opening}
        className="ml-auto flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-beige/15 bg-card/40 px-2 text-xs text-foreground/80 transition hover:border-beige/30 hover:bg-white/5 hover:text-beige disabled:opacity-60 sm:ml-0"
      >
        {opening ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ExternalLink className="h-3 w-3" />
        )}
        <span className="hidden sm:inline">Otwórz na żywo</span>
      </button>
    </div>
  );
}

function ToggleButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={`flex h-6 cursor-pointer items-center gap-1 rounded px-2 text-xs transition ${
        active
          ? "bg-beige text-beige-foreground"
          : "text-muted-foreground hover:bg-white/5 hover:text-beige"
      }`}
    >
      <Icon className="h-3 w-3" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
