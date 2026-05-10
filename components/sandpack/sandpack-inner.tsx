"use client";

import { useEffect, useState } from "react";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackCodeEditor,
  SandpackFileExplorer,
  SandpackConsole,
  type SandpackTheme,
} from "@codesandbox/sandpack-react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  MousePointer2,
  Terminal as TerminalIcon,
} from "lucide-react";
import { STARTER_DEPENDENCIES } from "@/lib/sandpack/starter";
import { SandpackSaver } from "./sandpack-saver";
import type { SandpackRunnerProps } from "./sandpack-runner";

const wybitnaTheme: SandpackTheme = {
  colors: {
    surface1: "#0a0a0a",
    surface2: "#141414",
    surface3: "#1f1f1f",
    clickable: "#a1a1aa",
    base: "#fafafa",
    disabled: "#52525b",
    hover: "#e8dcc4",
    accent: "#e8dcc4",
    error: "#fca5a5",
    errorSurface: "#1f1f1f",
  },
  syntax: {
    plain: "#fafafa",
    comment: { color: "#52525b", fontStyle: "italic" },
    keyword: "#e8dcc4",
    tag: "#e8dcc4",
    punctuation: "#a1a1aa",
    definition: "#fde68a",
    property: "#fde68a",
    static: "#fbbf24",
    string: "#86efac",
  },
  font: {
    body: "var(--font-geist-sans), -apple-system, sans-serif",
    mono: 'var(--font-geist-mono), "Fira Code", monospace',
    size: "13px",
    lineHeight: "20px",
  },
};

/** Tailwind CSS via externalResources (CSP-safe). */
const EXTERNAL_RESOURCES = ["https://cdn.tailwindcss.com"];

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function SandpackInner({
  files,
  viewMode = "split",
  selectMode = false,
  onElementPick,
  hideInternalNavigator = false,
  projectId,
  isGenerating = false,
}: SandpackRunnerProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [terminalOpen, setTerminalOpen] = useState(true);

  return (
    <SandpackProvider
      template="react-ts"
      theme={wybitnaTheme}
      files={files}
      customSetup={{
        dependencies: STARTER_DEPENDENCIES,
        // Explicitly declare entry so the bundler doesn't guess create-react-app
        entry: "/index.tsx",
      }}
      options={{
        recompileMode: "delayed",
        recompileDelay: 800,
        autorun: true,
        autoReload: true,
        externalResources: EXTERNAL_RESOURCES,
        // Use the official Sandpack bundler CDN — more reliable than the default
        bundlerURL: "https://sandpack-bundler.codesandbox.io",
        // Delay bundler initialisation until preview is first shown
        initMode: "lazy",
      }}
    >
      {projectId && (
        <SandpackSaver projectId={projectId} onSaveStatus={setSaveStatus} />
      )}

      <div className="relative flex h-full w-full overflow-hidden bg-[#0a0a0a]">
        {projectId && viewMode === "code" && saveStatus !== "idle" && (
          <SaveIndicator status={saveStatus} />
        )}

        {viewMode === "code" && (
          <CodeView
            terminalOpen={terminalOpen}
            onToggleTerminal={() => setTerminalOpen((v) => !v)}
            projectId={projectId}
            readOnly={isGenerating}
          />
        )}

        {viewMode === "split" && (
          <SplitView
            selectMode={selectMode}
            onElementPick={onElementPick}
            hideInternalNavigator={hideInternalNavigator}
          />
        )}

        {viewMode === "preview" && (
          <PreviewWithOverlay
            selectMode={selectMode}
            onElementPick={onElementPick}
            hideNavigator={hideInternalNavigator}
            full
          />
        )}
      </div>
    </SandpackProvider>
  );
}

// ─── Code view: explorer | editor + terminal ───────────────────────────────────

function CodeView({
  terminalOpen,
  onToggleTerminal,
  projectId,
  readOnly = false,
}: {
  terminalOpen: boolean;
  onToggleTerminal: () => void;
  projectId?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="flex h-full w-full">
      {/* File explorer — ukryty na mobile, oddzielony cienka linia */}
      <aside className="hidden h-full w-[200px] shrink-0 border-r border-beige/10 md:block lg:w-[220px]">
        <SandpackFileExplorer style={{ height: "100%" }} />
      </aside>

      {/* Edytor + terminal (kolumna) */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-hidden">
          <SandpackCodeEditor
            showTabs
            showLineNumbers
            showInlineErrors
            wrapContent={false}
            readOnly={readOnly}
            style={{ height: "100%" }}
          />
        </div>

        {/* Konsola — collapsible; pokazuje console.log/warn/error z podglądu */}
        <div
          className={`flex shrink-0 flex-col border-t border-beige/10 transition-all ${
            terminalOpen ? "h-[38%] min-h-[140px]" : "h-9"
          }`}
        >
          <button
            type="button"
            onClick={onToggleTerminal}
            className="flex h-9 shrink-0 cursor-pointer items-center justify-between gap-2 border-b border-beige/10 bg-card/40 px-3 text-xs text-foreground/80 transition hover:bg-white/5 hover:text-beige"
          >
            <span className="flex items-center gap-1.5">
              <TerminalIcon className="h-3 w-3" />
              Konsola
            </span>
            {terminalOpen ? (
              <ChevronDown className="h-3 w-3 opacity-70" />
            ) : (
              <ChevronUp className="h-3 w-3 opacity-70" />
            )}
          </button>
          {terminalOpen && (
            <div className="flex min-h-0 flex-1 flex-col">
              {/* Info bar — explains this is a browser preview, not a real shell */}
              <div className="shrink-0 border-b border-beige/10 bg-[#0a0a0a] px-3 py-1.5 text-[11px] text-neutral-500">
                Konsola podglądu (console.log / błędy JS) · npm/node niedostępne — użyj chatu AI
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <SandpackConsole
                  showHeader={false}
                  style={{ height: "100%", background: "#0a0a0a", fontSize: "12px" }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Split view: explorer | editor | preview ──────────────────────────────────

function SplitView({
  selectMode,
  onElementPick,
  hideInternalNavigator,
}: {
  selectMode: boolean;
  onElementPick?: (info: { x: number; y: number }) => void;
  hideInternalNavigator: boolean;
}) {
  return (
    <div className="flex h-full w-full">
      <aside className="hidden h-full w-[200px] shrink-0 border-r border-beige/10 md:block">
        <SandpackFileExplorer style={{ height: "100%" }} />
      </aside>
      <div className="flex min-w-0 flex-1 border-r border-beige/10">
        <SandpackCodeEditor
          showTabs
          showLineNumbers
          showInlineErrors
          wrapContent={false}
          style={{ height: "100%", width: "100%" }}
        />
      </div>
      <PreviewWithOverlay
        selectMode={selectMode}
        onElementPick={onElementPick}
        hideNavigator={hideInternalNavigator}
      />
    </div>
  );
}

// ─── Save indicator ───────────────────────────────────────────────────────────

function SaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <div
      className={`pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-all ${
        status === "saving"
          ? "border-beige/20 bg-background/80 text-muted-foreground"
          : status === "saved"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-red-500/30 bg-red-500/10 text-red-300"
      }`}
    >
      {status === "saving" ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Zapisuję…
        </>
      ) : status === "saved" ? (
        <>
          <Check className="h-3 w-3" />
          Zapisano
        </>
      ) : (
        "Błąd zapisu"
      )}
    </div>
  );
}

// ─── Preview with element picker overlay ──────────────────────────────────────

function PreviewWithOverlay({
  selectMode,
  onElementPick,
  hideNavigator,
  full = false,
}: {
  selectMode: boolean;
  onElementPick?: (info: {
    x: number;
    y: number;
    selector?: string;
    html?: string;
    tagName?: string;
  }) => void;
  hideNavigator: boolean;
  full?: boolean;
}) {
  // Faza 1.4: nasluchuje wiadomosci postMessage z iframe (DOM picker).
  useEffect(() => {
    if (!selectMode) return;
    const handler = (e: MessageEvent) => {
      const data = e.data;
      if (data?.type === "wybitna:pick") {
        onElementPick?.({
          x: 0,
          y: 0,
          selector: data.selector,
          html: data.html,
          tagName: data.tagName,
        });
      }
    };
    window.addEventListener("message", handler);

    // Aktywuj tryb pickera w iframe
    const iframe = document.querySelector(
      ".sp-preview-iframe, iframe[title='Sandpack Preview']",
    ) as HTMLIFrameElement | null;
    iframe?.contentWindow?.postMessage(
      { type: "wybitna:set-pick-mode", active: true },
      "*",
    );

    return () => {
      window.removeEventListener("message", handler);
      iframe?.contentWindow?.postMessage(
        { type: "wybitna:set-pick-mode", active: false },
        "*",
      );
    };
  }, [selectMode, onElementPick]);

  return (
    <div
      className="relative min-w-0"
      style={{
        height: "100%",
        flex: 1,
        width: full ? "100%" : undefined,
      }}
    >
      <SandpackPreview
        showOpenInCodeSandbox={false}
        showRefreshButton={!hideNavigator}
        showNavigator={!hideNavigator}
        style={{ height: "100%", width: "100%" }}
      />
      {selectMode && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-beige/30 bg-background/90 px-2.5 py-1 text-[11px] text-beige shadow">
            <MousePointer2 className="h-3 w-3" />
            Tryb wyboru — kliknij element w podglądzie
          </span>
        </div>
      )}
    </div>
  );
}
