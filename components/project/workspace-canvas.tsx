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
  ImageIcon,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  PictureInPicture2,
  RotateCw,
  Settings,
} from "lucide-react";
import { AppleIcon, AndroidIcon } from "@/components/brand-icons";
import { DatabasePanel } from "@/components/project/database-panel";
import { SnapshotPanel } from "@/components/project/snapshot-panel";
import { ErrorWatcher } from "@/components/project/error-watcher";
import { LockFilesDialog } from "@/components/project/lock-files-dialog";
import { FloatingPreview } from "@/components/project/floating-preview";
import { StripePanel } from "@/components/project/stripe-panel";
import { AssetManager } from "@/components/project/asset-manager";
import { TEMPLATES } from "@/lib/templates";
import { mergeWebContainerReactFiles } from "@/lib/webcontainer/merge-wc-files";
import type { Project } from "@/lib/types/project";

const WCRuntime = dynamic(
  () => import("@/components/webcontainer/wc-runtime").then((m) => m.WCRuntime),
  { ssr: false, loading: () => <WCLoader /> },
);
const CodeWithTerminal = dynamic(
  () =>
    import("@/components/project/code-with-terminal").then(
      (m) => m.CodeWithTerminal,
    ),
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

type WorkspaceView =
  | "preview"
  | "code"
  | "database"
  | "snapshots"
  | "stripe"
  | "assets";

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
  /** Tryb chatu — w `plan` nie pokazujemy overlay (podgląd zostaje statyczny). */
  chatMode?: "build" | "plan" | "discuss";
  /** Czy projekt ma już wygenerowane pliki — gdy true to overlay degraduje do paska. */
  hasFiles?: boolean;
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
  chatMode = "build",
  hasFiles = false,
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
  const hardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function clearAll() {
      setBuildFile(null);
      setWrittenFiles([]);
    }
    function handlePartialWrite(e: Event) {
      const { path } = (e as CustomEvent<{ path: string; content: string }>).detail;
      setBuildFile(path);
      setWrittenFiles((prev) =>
        prev.includes(path) ? prev : [...prev, path],
      );
      // Soft timeout: hide overlay 3 seconds after the last write event (idle).
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(clearAll, 3000);
      // Hard timeout: always hide overlay after 10 seconds, niezaleznie od eventow.
      // Chroni przed sytuacjami gdy stream wisi i overlay zostaje na ekranie.
      if (hardTimerRef.current) clearTimeout(hardTimerRef.current);
      hardTimerRef.current = setTimeout(clearAll, 10_000);
    }
    function handleStreamEnd() {
      clearAll();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (hardTimerRef.current) clearTimeout(hardTimerRef.current);
    }
    window.addEventListener("wybitna:partial-write", handlePartialWrite);
    window.addEventListener("wybitna:partial-write-end", handleStreamEnd);
    return () => {
      window.removeEventListener("wybitna:partial-write", handlePartialWrite);
      window.removeEventListener("wybitna:partial-write-end", handleStreamEnd);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (hardTimerRef.current) clearTimeout(hardTimerRef.current);
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

  /**
   * Smart fallback dla "Otworz w nowej karcie":
   * - Jezeli projekt opublikowany -> otwiera {slug}.{publishDomain} w nowej karcie.
   * - Jezeli nie -> dispatchuje event 'wybitna:request-publish' ktory otwiera
   *   PublishDialog w topbarze. Bezposrednie window.open(wcUrl) nie dziala —
   *   StackBlitz WebContainer wymaga "Connect to project" -> 404.
   */
  function handleOpenLive() {
    if (project.is_public && project.slug) {
      const url = buildSubdomainUrl(project.slug, publishDomain);
      window.open(url, "_blank", "noopener");
      return;
    }
    window.dispatchEvent(new CustomEvent("wybitna:request-publish"));
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
        isPublished={project.is_public && !!project.slug}
        displayUrl={displayUrl}
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
              <CodeWithTerminal
                projectId={project.id}
                files={project.files}
                lockedPaths={project.locked_files}
                readOnly={buildFile !== null && chatMode !== "plan"}
                showTerminal={useWC}
              />
            </div>
          </>
        )}

        {isCodeOnly && view === "code" && (
          <WorkspaceCodeEditor
            projectId={project.id}
            files={project.files}
            lockedPaths={project.locked_files}
            readOnly={buildFile !== null && chatMode !== "plan"}
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

        {view === "assets" && <AssetManager files={project.files} />}

        {view === "preview" && onFixError && (
          <ErrorWatcher onFixRequest={onFixError} isStreaming={isStreaming} />
        )}

        {/* Build progress feedback.
            - Plan mode → totally hidden (preview stays static).
            - Build/edit mode with existing files → slim top progress bar (hot refresh).
            - Initial build (no files yet) → full-screen overlay. */}
        {buildFile && view === "preview" && chatMode !== "plan" && (
          hasFiles ? (
            <BuildProgressBar currentFile={buildFile} />
          ) : (
            <BuildProgressOverlay
              currentFile={buildFile}
              writtenFiles={writtenFiles}
            />
          )
        )}
      </div>
    </div>
  );
}

/**
 * Slim top progress bar — wyswietlana podczas edycji istniejacej strony (hasFiles).
 * Nie blokuje podgladu: uzytkownik widzi zmiany "na zywo" w trakcie patchowania.
 */
function BuildProgressBar({ currentFile }: { currentFile: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col">
      <div className="h-0.5 w-full overflow-hidden bg-beige/20">
        <div className="h-full w-1/3 animate-[pulse_1.4s_ease-in-out_infinite] bg-beige" />
      </div>
      <div className="self-center mt-1 inline-flex items-center gap-1.5 rounded-full border border-beige/20 bg-card/90 px-2.5 py-0.5 text-[10px] text-foreground/80 shadow-sm backdrop-blur">
        <Loader2 className="h-2.5 w-2.5 animate-spin text-beige" />
        <span className="truncate font-mono">{currentFile}</span>
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
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-2xl border-2 border-beige/40 bg-background/90 p-6 shadow-2xl shadow-black/40">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-beige/10">
          <Loader2 className="h-5 w-5 animate-spin text-beige" />
        </div>
        <div className="w-full text-center">
          <p className="mb-1.5 text-base font-medium text-white">
            Buduję Twoją stronę…
          </p>
          <p className="text-xs leading-relaxed text-white/70">
            W niedalekiej przyszłości zobaczysz tutaj podgląd strony.
          </p>
          {currentFile && (
            <p className="mt-2 flex items-center justify-center gap-1.5 truncate text-[10px] text-beige/70">
              <FileCode2 className="h-3 w-3 shrink-0 text-beige/70" />
              <span className="truncate font-mono">{currentFile}</span>
            </p>
          )}
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
  isPublished,
  displayUrl,
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
  isPublished: boolean;
  displayUrl: string;
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
      {/* View toggles — same ikony z tooltipem */}
      <div className="flex items-center gap-0.5 rounded-md border border-beige/15 bg-card/40 p-0.5">
        {!isCodeOnly && (
          <IconToggle
            icon={Eye}
            label="Podgląd"
            active={view === "preview"}
            onClick={() => onViewChange("preview")}
          />
        )}
        <IconToggle
          icon={Code2}
          label="Kod"
          active={view === "code"}
          onClick={() => onViewChange("code")}
        />
      </div>

      {/* Baza + More menu (Stripe/Zasoby/Historia) — kliknięcie otwiera
          ProjectSettingsDialog na właściwej zakładce (event delegowany do
          ProjectTopbar przez `wybitna:open-settings`). */}
      <div className="flex items-center gap-0.5 rounded-md border border-beige/15 bg-card/40 p-0.5">
        {!isCodeOnly && (
          <IconToggle
            icon={Database}
            label="Baza"
            active={false}
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("wybitna:open-settings", {
                  detail: { tab: "database" },
                }),
              )
            }
          />
        )}
        <MoreMenu isCodeOnly={isCodeOnly} />
        {/* Przycisk Ustawień — przeniesiony tutaj z topbara, na prawo od "Więcej" */}
        <button
          type="button"
          title="Ustawienia projektu"
          aria-label="Ustawienia projektu"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("wybitna:open-settings", {
                detail: { tab: "general" },
              }),
            )
          }
          className="flex h-6 cursor-pointer items-center justify-center rounded px-1.5 text-xs transition text-muted-foreground hover:bg-white/5 hover:text-beige"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* URL bar — tylko dla web, zwężony do 50% żeby nie wypychał toolbara */}
      {!isCodeOnly && (
        <div className="mx-1 hidden h-7 max-w-[50%] min-w-0 shrink items-center gap-2 rounded-md border border-beige/15 bg-card/40 px-2 text-xs text-muted-foreground sm:flex">
          <span className="min-w-0 flex-1 truncate font-mono">{displayUrl}</span>
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

      {/* Right toolbar — wszystkie akcje icon-only z tooltipem */}
      {!isCodeOnly && (
        <IconButton
          icon={Pencil}
          label={editTextMode ? "Wyłącz edycję" : "Edytuj tekst"}
          tooltip="Edytuj tekst bezpośrednio w podglądzie (klik → wpisz → Enter)"
          active={editTextMode}
          onClick={onToggleEditTextMode}
          className="ml-auto sm:ml-0"
        />
      )}

      {!isCodeOnly && onToggleFloating && (
        <IconButton
          icon={PictureInPicture2}
          label="Float"
          tooltip="Floating preview — draggable window"
          active={!!floatingOpen}
          onClick={onToggleFloating}
        />
      )}

      <IconButton
        icon={Lock}
        label="Zablokuj pliki"
        tooltip="Zablokuj pliki przed nadpisaniem przez AI"
        onClick={onOpenLockDialog}
        className={isCodeOnly ? "ml-auto" : ""}
      />

      {/* Akcja koncowa: code-only → eksport ZIP, web → otworz w nowej karcie */}
      {isCodeOnly ? (
        <a
          href={`/api/export/zip?projectId=${encodeURIComponent(projectId)}`}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-beige/30 bg-beige/15 text-beige transition hover:bg-beige/25"
          title={
            platform === "ios"
              ? "Eksport do Xcode 15+"
              : "Eksport do Android Studio"
          }
          aria-label="Eksport ZIP"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      ) : (
        <IconButton
          icon={ExternalLink}
          label="Otwórz w nowej karcie"
          tooltip={
            isPublished
              ? "Otwiera opublikowana strone w nowej karcie"
              : "Najpierw opublikuj projekt — klikniecie otworzy dialog publikacji"
          }
          onClick={onOpenLive}
        />
      )}
    </div>
  );
}

/**
 * IconButton — przycisk z sama ikona, etykieta widoczna tylko jako native
 * tooltip (atrybut `title`). Subtelny border + tinted background na hover.
 */
function IconButton({
  icon: Icon,
  label,
  tooltip,
  active,
  onClick,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tooltip?: string;
  active?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={tooltip ?? label}
      className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border transition ${
        active
          ? "border-beige/40 bg-beige/15 text-beige"
          : "border-beige/15 bg-card/40 text-foreground/80 hover:border-beige/30 hover:bg-white/5 hover:text-beige"
      } ${className}`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

/**
 * MoreMenu — animowany dropdown z dodatkowymi widokami (Stripe / Zasoby /
 * Historia). Trigger = ikona MoreHorizontal, klik rozwija liste z gory na dol
 * przez CSS transition + framer-style scale enter.
 */
function MoreMenu({ isCodeOnly }: { isCodeOnly: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Mapowanie pozycji menu → tab w ProjectSettingsDialog. Kazda pozycja
  // dispatchuje globalny event do ProjectTopbar, ktory otwiera ustawienia
  // na wybranej zakladce (zamiast switchowac canvas view).
  const items: { tab: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    ...(isCodeOnly
      ? []
      : ([
          { tab: "stripe" as const, label: "Stripe", icon: CreditCard },
          { tab: "file-storage" as const, label: "Zasoby", icon: ImageIcon },
        ])),
    { tab: "history" as const, label: "Historia", icon: History },
  ];

  // Po przeniesieniu sekcji do Settings dialog menu nie ma juz "aktywnego"
  // stanu zaleznego od canvas view — zostawiamy zwykly hover.
  const activeInMenu = false;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Więcej widoków (Stripe, Zasoby, Historia)"
        aria-label="Więcej"
        aria-expanded={open}
        className={`flex h-6 cursor-pointer items-center justify-center rounded px-2 text-xs transition ${
          activeInMenu || open
            ? "bg-beige text-beige-foreground"
            : "text-muted-foreground hover:bg-white/5 hover:text-beige"
        }`}
      >
        <MoreHorizontal className="h-3 w-3" />
      </button>
      {/* Dropdown panel — CSS transition (scale + opacity od gory na dol) */}
      <div
        className={`absolute right-0 top-full z-30 mt-1 min-w-[150px] origin-top-right overflow-hidden rounded-lg border border-beige/15 bg-card shadow-2xl shadow-black/40 transition-all duration-150 ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        }`}
      >
        <ul className="py-1 text-xs">
          {items.map((it, idx) => {
            const Icon = it.icon;
            return (
              <li
                key={it.tab}
                style={{ transitionDelay: open ? `${idx * 30}ms` : "0ms" }}
                className={`transition-all duration-200 ${
                  open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("wybitna:open-settings", {
                        detail: { tab: it.tab },
                      }),
                    );
                    setOpen(false);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-foreground/80 transition hover:bg-white/5 hover:text-beige"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {it.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function IconToggle({
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
      aria-label={label}
      title={label}
      className={`flex h-6 w-7 cursor-pointer items-center justify-center rounded transition ${
        active
          ? "bg-beige text-beige-foreground"
          : "text-muted-foreground hover:bg-white/5 hover:text-beige"
      }`}
    >
      <Icon className="h-3 w-3" />
    </button>
  );
}
