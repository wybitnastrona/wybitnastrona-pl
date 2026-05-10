"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Code2,
  Database,
  ExternalLink,
  Eye,
  FileCode2,
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

  // Build progress overlay — shows which file is being generated
  const [buildFile, setBuildFile] = useState<string | null>(null);
  const [writtenFiles, setWrittenFiles] = useState<string[]>([]);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handlePartialWrite(e: Event) {
      const { path } = (e as CustomEvent<{ path: string; content: string }>).detail;
      setBuildFile(path);
      setWrittenFiles((prev) =>
        prev.includes(path) ? prev : [...prev, path],
      );
      // Hide overlay 3 seconds after the last write event
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setBuildFile(null);
        setWrittenFiles([]);
      }, 3000);
    }
    window.addEventListener("wybitna:partial-write", handlePartialWrite);
    return () => {
      window.removeEventListener("wybitna:partial-write", handlePartialWrite);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

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
        slug={liveSlug ?? undefined}
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
              isGenerating={buildFile !== null}
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

        {/* Build progress overlay */}
        {buildFile && view === "preview" && (
          <BuildProgressOverlay
            currentFile={buildFile}
            writtenFiles={writtenFiles}
          />
        )}
      </div>
    </div>
  );
}

function BuildProgressOverlay({
  currentFile,
  writtenFiles,
}: {
  currentFile: string;
  writtenFiles: string[];
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-2xl border border-beige/20 bg-card/90 p-6 shadow-2xl">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-beige/10">
          <Loader2 className="h-5 w-5 animate-spin text-beige" />
        </div>
        <div className="w-full text-center">
          <p className="mb-1 text-sm font-medium text-foreground">
            Buduję Twoją stronę…
          </p>
          <p className="flex items-center justify-center gap-1.5 truncate text-[11px] text-muted-foreground">
            <FileCode2 className="h-3 w-3 shrink-0 text-beige/70" />
            <span className="truncate font-mono">{currentFile}</span>
          </p>
        </div>
        {writtenFiles.length > 1 && (
          <div className="w-full">
            <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Zapisane pliki</span>
              <span>{writtenFiles.length}</span>
            </div>
            <div className="max-h-24 overflow-y-auto space-y-0.5">
              {writtenFiles.map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  <FileCode2 className="h-2.5 w-2.5 shrink-0 text-beige/50" />
                  <span className="truncate font-mono">{f}</span>
                </div>
              ))}
            </div>
          </div>
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
  slug,
  publishDomain,
  useWC,
}: {
  view: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  onOpenLive: () => void;
  opening: boolean;
  liveUrl: string | null;
  slug?: string;
  publishDomain: string;
  useWC: boolean;
}) {
  // Show the real project slug URL even before the project is published.
  const displayUrl = liveUrl ?? (slug ? buildSubdomainUrl(slug, publishDomain) : `https://projekt.${publishDomain}`);

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
