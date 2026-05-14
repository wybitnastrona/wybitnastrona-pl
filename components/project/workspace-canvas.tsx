"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Code2,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileCode2,
  History,
  Loader2,
  Lock,
  Pencil,
  PictureInPicture2,
  RotateCw,
  SquareTerminal,
} from "lucide-react";
import { AppleIcon, AndroidIcon } from "@/components/brand-icons";
import { DatabasePanel } from "@/components/project/database-panel";
import { SnapshotPanel } from "@/components/project/snapshot-panel";
import { ErrorWatcher } from "@/components/project/error-watcher";
import { LockFilesDialog } from "@/components/project/lock-files-dialog";
import { FloatingPreview } from "@/components/project/floating-preview";
import { StripePanel } from "@/components/project/stripe-panel";
import { TEMPLATES } from "@/lib/templates";
import { mergeWebContainerReactFiles } from "@/lib/webcontainer/merge-wc-files";
import type { Project } from "@/lib/types/project";

const WCRuntime = dynamic(
  () => import("@/components/webcontainer/wc-runtime").then((m) => m.WCRuntime),
  { ssr: false, loading: () => <WCLoader /> },
);
const WCTerminal = dynamic(
  () => import("@/components/webcontainer/wc-terminal").then((m) => m.WCTerminal),
  { ssr: false, loading: () => <WCLoader /> },
);
const WorkspaceCodeEditor = dynamic(
  () =>
    import("@/components/project/workspace-code-editor").then(
      (m) => m.WorkspaceCodeEditor,
    ),
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

type WorkspaceView = "preview" | "code" | "database" | "snapshots" | "terminal" | "stripe";

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
  onFixError?: (hint: string, opts: { auto: boolean }) => void;
  /** True jezeli AI obecnie generuje — auto-fix nie wystartuje wtedy. */
  isStreaming?: boolean;
  /** Z menu plików: włącza tryb „wskaż w podglądzie” (jak Target all). */
  onActivatePreviewPickMode?: () => void;
};

export function WorkspaceCanvas({
  project,
  publishDomain,
  selectMode,
  onElementPick,
  onFixError,
  isStreaming = false,
  onActivatePreviewPickMode,
}: Props) {
  const router = useRouter();
  // Lazy initial view: dla code-only templates (iOS / Android) zaczynamy od "code",
  // dla pozostalych — od "preview".
  const templateIdForInit = project.template ?? "react-ts";
  const initialView: WorkspaceView =
    TEMPLATES.find((t) => t.id === templateIdForInit)?.codeOnly === true
      ? "code"
      : "preview";
  const [view, setView] = useState<WorkspaceView>(initialView);
  const [opening, setOpening] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [editTextMode, setEditTextMode] = useState(false);
  const [floatingOpen, setFloatingOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<
    | null
    | { kind: "saving" }
    | { kind: "saved"; file: string }
    | { kind: "error"; message: string }
  >(null);

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

  // ─── Visual inline editor ────────────────────────────────────────────────
  // Tells the preview iframe to switch into edit-text mode and listens for
  // commits posted back from the picker script.
  useEffect(() => {
    function getIframe() {
      return document.querySelector(
        "iframe[title='Preview']",
      ) as HTMLIFrameElement | null;
    }

    if (editTextMode) {
      // Activation may need a tick for the iframe to register the listener.
      const id = setTimeout(() => {
        getIframe()?.contentWindow?.postMessage(
          { type: "wybitna:set-edit-mode", active: true },
          "*",
        );
      }, 50);
      return () => clearTimeout(id);
    }
    getIframe()?.contentWindow?.postMessage(
      { type: "wybitna:set-edit-mode", active: false },
      "*",
    );
  }, [editTextMode]);

  // Picker w iframe → workspace-canvas (zdarzenie `wybitna:pick` z element-picker-script).
  useEffect(() => {
    function onPick(e: MessageEvent) {
      const data = e.data;
      if (data?.type !== "wybitna:pick") return;
      onElementPick({
        x: typeof data.x === "number" ? data.x : 0,
        y: typeof data.y === "number" ? data.y : 0,
        selector: typeof data.selector === "string" ? data.selector : undefined,
        html: typeof data.html === "string" ? data.html : undefined,
        tagName: typeof data.tagName === "string" ? data.tagName : undefined,
      });
    }
    window.addEventListener("message", onPick);
    return () => window.removeEventListener("message", onPick);
  }, [onElementPick]);

  // Trigger trybu picker z menu „Wskaż w podglądzie".
  useEffect(() => {
    if (!onActivatePreviewPickMode) return;
    function handler() {
      const iframe = document.querySelector(
        "iframe[title='Preview']",
      ) as HTMLIFrameElement | null;
      iframe?.contentWindow?.postMessage(
        { type: "wybitna:set-pick-mode", active: true },
        "*",
      );
    }
    window.addEventListener("wybitna:request-pick-mode", handler);
    return () => window.removeEventListener("wybitna:request-pick-mode", handler);
  }, [onActivatePreviewPickMode]);

  useEffect(() => {
    async function onMessage(e: MessageEvent) {
      const data = e.data;
      if (data?.type !== "wybitna:edit-text") return;
      const original = String(data.original ?? "");
      const next = String(data.next ?? "");
      if (!original || !next || original === next) return;

      setEditStatus({ kind: "saving" });
      try {
        const res = await fetch(`/api/projects/${project.id}/inline-edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ original, next }),
        });
        const payload = (await res.json()) as {
          ok?: boolean;
          file?: string;
          error?: string;
        };
        if (!res.ok || !payload.ok) {
          setEditStatus({
            kind: "error",
            message: payload.error ?? "Nie udało się zapisać zmiany.",
          });
        } else {
          setEditStatus({
            kind: "saved",
            file: payload.file ?? "",
          });
          // Refresh the page so the new files are picked up.
          router.refresh();
        }
      } catch {
        setEditStatus({ kind: "error", message: "Błąd sieci." });
      } finally {
        setTimeout(() => setEditStatus(null), 3500);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [project.id, router]);

  const templateDef = TEMPLATES.find((t) => t.id === (project.template ?? "react-ts"));
  const isCodeOnly = templateDef?.codeOnly === true;

  // Po migracji WebContainer obsługuje wszystkie szablony web (z dev serverem).
  // Code-only (iOS / Android / watchOS / tvOS / visionOS) nie ma podglądu.
  const useWC = !isCodeOnly;
  const wcFiles = useMemo(() => {
    if (!useWC) return project.files;
    // Merge React+Vite starter only for react-ts — other WC templates (Next/Astro/Vue/Svelte/Expo)
    // have their own complete starters and don't need the React starter overlaid on top.
    if (templateDef?.id === "react-ts" || !templateDef?.id) {
      return mergeWebContainerReactFiles(project.files);
    }
    return project.files;
  }, [useWC, project.files, templateDef?.id]);
  const [wcUrl, setWcUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectMode) return;
    queueMicrotask(() => {
      setView("preview");
    });
    // Aktywuj tryb picker w iframe WC.
    const id = setTimeout(() => {
      const iframe = document.querySelector(
        "iframe[title='Preview']",
      ) as HTMLIFrameElement | null;
      iframe?.contentWindow?.postMessage(
        { type: "wybitna:set-pick-mode", active: true },
        "*",
      );
    }, 80);
    return () => clearTimeout(id);
  }, [selectMode]);

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
  // URL widoczny w pasku adresu workspace. Priorytet: lokalny URL z WebContainera
  // → subdomena publikacyjna → placeholder root domain.
  const displayUrl =
    wcUrl ??
    liveUrl ??
    (liveSlug
      ? buildSubdomainUrl(liveSlug, publishDomain)
      : `https://${publishDomain}`);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <CanvasTopbar
        view={view}
        onViewChange={setView}
        onOpenLive={handleOpenLive}
        opening={opening}
        displayUrl={displayUrl}
        useWC={useWC}
        isCodeOnly={isCodeOnly}
        platform={(project.mode as "ios" | "android" | "web" | null) ?? null}
        projectId={project.id}
        onOpenLockDialog={() => setLockDialogOpen(true)}
        editTextMode={editTextMode}
        onToggleEditTextMode={() => setEditTextMode((v) => !v)}
        floatingOpen={floatingOpen}
        onToggleFloating={() => setFloatingOpen((v) => !v)}
      />

      {floatingOpen && !isCodeOnly && (
        <FloatingPreview
          previewUrl={displayUrl}
          iframeSrc={wcUrl ?? undefined}
          onClose={() => setFloatingOpen(false)}
        />
      )}

      {isCodeOnly && (
        <CodeOnlyBanner
          projectId={project.id}
          platform={(project.mode as "ios" | "android" | "web" | null) ?? null}
        />
      )}

      {editStatus && view === "preview" && (
        <div className="pointer-events-none absolute right-3 top-12 z-30">
          <div
            className={`pointer-events-auto rounded-md border px-2.5 py-1 text-xs shadow-lg ${
              editStatus.kind === "error"
                ? "border-rose-500/30 bg-rose-950/90 text-rose-100"
                : editStatus.kind === "saved"
                  ? "border-emerald-500/30 bg-emerald-950/85 text-emerald-100"
                  : "border-beige/20 bg-card text-foreground"
            }`}
          >
            {editStatus.kind === "saving" && "Zapisuję zmianę…"}
            {editStatus.kind === "saved" &&
              `Zapisano w ${editStatus.file || "projekcie"}`}
            {editStatus.kind === "error" && editStatus.message}
          </div>
        </div>
      )}

      <LockFilesDialog
        projectId={project.id}
        files={project.files}
        open={lockDialogOpen}
        onClose={() => setLockDialogOpen(false)}
      />

      <div className="relative min-h-0 flex-1">
        {useWC && (
          <>
            {/* Preview (iframe z dev-servera Vite) — zawsze zamontowany, ukrywany przez CSS,
                dzieki czemu nie tracimy stanu serwera przy przelaczaniu Kod ↔ Podglad. */}
            <div className={view === "preview" ? "h-full" : "hidden h-full"}>
              <WCRuntime
                projectId={project.id}
                files={wcFiles}
                runCommand={templateDef?.runCommand}
                onServerReady={(url) => setWcUrl(url)}
              />
            </div>
            <div className={view === "code" ? "h-full" : "hidden h-full"}>
              <WorkspaceCodeEditor
                projectId={project.id}
                files={project.files}
                lockedPaths={project.locked_files}
                readOnly={buildFile !== null}
              />
            </div>
            <div className={view === "terminal" ? "h-full" : "hidden h-full"}>
              <WCTerminal />
            </div>
          </>
        )}

        {isCodeOnly && view === "code" && (
          <WorkspaceCodeEditor
            projectId={project.id}
            files={project.files}
            lockedPaths={project.locked_files}
            readOnly={buildFile !== null}
          />
        )}

        {view === "database" && <DatabasePanel project={project} />}

        {view === "stripe" && <StripePanel project={project} />}

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
          <ErrorWatcher onFixRequest={onFixError} isStreaming={isStreaming} />
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

function CodeOnlyBanner({
  projectId,
  platform,
}: {
  projectId: string;
  platform: "ios" | "android" | "web" | null;
}) {
  const isIos = platform === "ios";
  const Icon = isIos ? AppleIcon : AndroidIcon;
  const ide = isIos ? "Xcode 15+" : "Android Studio";
  const title = isIos ? "Aplikacja iOS (SwiftUI)" : "Aplikacja Android (Compose)";
  const hint = isIos
    ? "Brak podgladu w przegladarce — pobierz ZIP i otworz w Xcode."
    : "Brak podgladu w przegladarce — pobierz ZIP i otworz w Android Studio.";

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-beige/15 bg-beige/[0.04] px-4 py-2 text-[12px]">
      <Icon className="h-4 w-4 shrink-0 text-beige/80" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="truncate text-muted-foreground">{hint}</p>
      </div>
      <a
        href={`/api/export/zip?projectId=${encodeURIComponent(projectId)}`}
        className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-beige/30 bg-beige/15 px-2.5 text-[11px] font-medium text-beige transition hover:bg-beige/25"
      >
        <Download className="h-3 w-3" />
        Pobierz ZIP do {ide}
      </a>
    </div>
  );
}

function CanvasTopbar({
  view,
  onViewChange,
  onOpenLive,
  opening,
  displayUrl,
  useWC,
  isCodeOnly,
  platform,
  projectId,
  onOpenLockDialog,
  editTextMode,
  onToggleEditTextMode,
  floatingOpen,
  onToggleFloating,
}: {
  view: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  onOpenLive: () => void;
  opening: boolean;
  displayUrl: string;
  useWC: boolean;
  isCodeOnly: boolean;
  platform: "ios" | "android" | "web" | null;
  projectId: string;
  onOpenLockDialog: () => void;
  editTextMode: boolean;
  onToggleEditTextMode: () => void;
  floatingOpen?: boolean;
  onToggleFloating?: () => void;
}) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-beige/10 bg-background/80 px-2">
      <div className="flex items-center gap-0.5 rounded-md border border-beige/15 bg-card/40 p-0.5">
        {!isCodeOnly && (
          <ToggleButton
            icon={Eye}
            label="Podgląd"
            active={view === "preview"}
            onClick={() => onViewChange("preview")}
          />
        )}
        <ToggleButton
          icon={Code2}
          label="Kod"
          active={view === "code"}
          onClick={() => onViewChange("code")}
        />
        {useWC && (
          <ToggleButton
            icon={SquareTerminal}
            label="Terminal"
            active={view === "terminal"}
            onClick={() => onViewChange("terminal")}
          />
        )}
      </div>

      {/* Dodatkowe panele — Baza / Historia (baza ma sens tylko dla web) */}
      <div className="flex items-center gap-0.5 rounded-md border border-beige/15 bg-card/40 p-0.5">
        {!isCodeOnly && (
          <ToggleButton
            icon={Database}
            label="Baza"
            active={view === "database"}
            onClick={() => onViewChange("database")}
          />
        )}
        {!isCodeOnly && (
          <ToggleButton
            icon={CreditCard}
            label="Stripe"
            active={view === "stripe"}
            onClick={() => onViewChange("stripe")}
          />
        )}
        <ToggleButton
          icon={History}
          label="Historia"
          active={view === "snapshots"}
          onClick={() => onViewChange("snapshots")}
        />
      </div>

      {/* URL bar — tylko dla web */}
      {!isCodeOnly && (
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
      )}

      {/* Edytuj tekst — tylko dla web */}
      {!isCodeOnly && (
        <button
          type="button"
          onClick={onToggleEditTextMode}
          className={`ml-auto flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs transition sm:ml-0 ${
            editTextMode
              ? "border-beige/40 bg-beige/15 text-beige"
              : "border-beige/15 bg-card/40 text-foreground/80 hover:border-beige/30 hover:bg-white/5 hover:text-beige"
          }`}
          title="Edytuj tekst bezpośrednio w podglądzie (klik → wpisz → Enter)"
          aria-pressed={editTextMode}
        >
          <Pencil className="h-3 w-3" />
          <span className="hidden sm:inline">
            {editTextMode ? "Wyłącz edycję" : "Edytuj tekst"}
          </span>
        </button>
      )}

      {/* Floating preview toggle (nie dla code-only) */}
      {!isCodeOnly && onToggleFloating && (
        <button
          type="button"
          onClick={onToggleFloating}
          className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs transition ${
            floatingOpen
              ? "border-beige/40 bg-beige/15 text-beige"
              : "border-beige/15 bg-card/40 text-foreground/80 hover:border-beige/30 hover:bg-white/5 hover:text-beige"
          }`}
          title="Floating preview — draggable window (jak Rork)"
          aria-pressed={floatingOpen}
        >
          <PictureInPicture2 className="h-3 w-3" />
          <span className="hidden sm:inline">Float</span>
        </button>
      )}

      <button
        type="button"
        onClick={onOpenLockDialog}
        className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-beige/15 bg-card/40 px-2 text-xs text-foreground/80 transition hover:border-beige/30 hover:bg-white/5 hover:text-beige ${
          isCodeOnly ? "ml-auto" : ""
        }`}
        title="Zablokuj pliki przed nadpisaniem przez AI"
      >
        <Lock className="h-3 w-3" />
        <span className="hidden sm:inline">Zablokuj pliki</span>
      </button>

      {/* Akcja koncowa: code-only → eksport ZIP, web → otworz na zywo */}
      {isCodeOnly ? (
        <a
          href={`/api/export/zip?projectId=${encodeURIComponent(projectId)}`}
          className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-beige/30 bg-beige/15 px-2 text-xs font-medium text-beige transition hover:bg-beige/25"
          title={platform === "ios" ? "Eksport do Xcode 15+" : "Eksport do Android Studio"}
        >
          <Download className="h-3 w-3" />
          <span className="hidden sm:inline">Eksport ZIP</span>
        </a>
      ) : (
        <button
          type="button"
          onClick={onOpenLive}
          disabled={opening}
          className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-beige/15 bg-card/40 px-2 text-xs text-foreground/80 transition hover:border-beige/30 hover:bg-white/5 hover:text-beige disabled:opacity-60"
        >
          {opening ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ExternalLink className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">Otwórz na żywo</span>
        </button>
      )}
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
