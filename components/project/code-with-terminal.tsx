"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, TerminalSquare } from "lucide-react";
import { WorkspaceCodeEditor } from "@/components/project/workspace-code-editor";
import type { ProjectFiles } from "@/lib/types/project";

const WCTerminal = dynamic(
  () => import("@/components/webcontainer/wc-terminal").then((m) => m.WCTerminal),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a] text-xs text-muted-foreground">
        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
        Ładuję terminal…
      </div>
    ),
  },
);

const MIN_TERMINAL = 0.15;
const MAX_TERMINAL = 0.7;
const DEFAULT_TERMINAL = 0.3;

type Props = {
  projectId: string;
  files: ProjectFiles;
  lockedPaths?: string[];
  readOnly?: boolean;
  /** Czy WebContainer (i tym samym terminal jsh) jest dostępny. */
  showTerminal: boolean;
};

/**
 * Widok "Kod": edytor Monaco u góry, terminal WebContainer u dołu.
 * Pasek między nimi pozwala zmienić proporcje przez drag.
 */
export function CodeWithTerminal({
  projectId,
  files,
  lockedPaths,
  readOnly,
  showTerminal,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [terminalFraction, setTerminalFraction] = useState(DEFAULT_TERMINAL);
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    function onMove(ev: MouseEvent) {
      if (!rect.height) return;
      // Convert mouse Y to terminal fraction (mouse from bottom = terminal height).
      const fromBottom = rect.bottom - ev.clientY;
      const next = Math.min(
        MAX_TERMINAL,
        Math.max(MIN_TERMINAL, fromBottom / rect.height),
      );
      setTerminalFraction(next);
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const effectiveFraction = terminalCollapsed ? 0 : terminalFraction;
  const editorPct = `${(1 - effectiveFraction) * 100}%`;
  const terminalPct = `${effectiveFraction * 100}%`;

  return (
    <div ref={containerRef} className="flex h-full w-full flex-col">
      <div style={{ height: editorPct }} className="min-h-0 overflow-hidden">
        <WorkspaceCodeEditor
          projectId={projectId}
          files={files}
          lockedPaths={lockedPaths}
          readOnly={readOnly}
        />
      </div>

      {showTerminal && (
        <>
          {/* Pasek z uchwytem do resize + przycisk collapse */}
          <div
            className="group relative flex h-6 shrink-0 cursor-row-resize items-center justify-between border-y border-beige/15 bg-card/40 px-3 text-[10px] uppercase tracking-wider text-muted-foreground"
            onMouseDown={terminalCollapsed ? undefined : startResize}
          >
            <span className="inline-flex items-center gap-1.5 pointer-events-none">
              <TerminalSquare className="h-3 w-3 text-beige/60" />
              Terminal
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTerminalCollapsed((v) => !v);
              }}
              className="cursor-pointer rounded px-1.5 py-0.5 text-[10px] text-muted-foreground/70 transition hover:bg-white/5 hover:text-beige"
            >
              {terminalCollapsed ? "Pokaż" : "Ukryj"}
            </button>
            {!terminalCollapsed && (
              <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 opacity-0 transition group-hover:opacity-60">
                <div className="mx-auto h-0.5 w-12 rounded-full bg-beige/40" />
              </div>
            )}
          </div>

          <div
            style={{ height: terminalPct }}
            className={
              terminalCollapsed
                ? "hidden"
                : "min-h-0 overflow-hidden border-t border-transparent"
            }
          >
            <WCTerminal />
          </div>
        </>
      )}
    </div>
  );
}
