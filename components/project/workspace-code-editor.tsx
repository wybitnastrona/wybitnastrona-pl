"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Check, Loader2 } from "lucide-react";
import { WorkspaceFileTree } from "./workspace-file-tree";
import { wcManager } from "@/components/webcontainer/wc-manager";
import type { ProjectFiles } from "@/lib/types/project";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
      Ładuję edytor…
    </div>
  ),
});

type SaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  projectId: string;
  files: ProjectFiles;
  lockedPaths?: string[];
  readOnly?: boolean;
  /** Domyślnie otwarty plik. Jeśli nie podano, bierzemy pierwszy widoczny. */
  initialPath?: string | null;
};

const SAVE_DEBOUNCE_MS = 1500;

function pickInitialPath(files: ProjectFiles, hint?: string | null): string | null {
  if (hint && files[hint]) return hint;
  const active = Object.entries(files).find(([, f]) => f.active && !f.hidden);
  if (active) return active[0];
  const firstVisible = Object.keys(files).find((p) => !files[p].hidden);
  return firstVisible ?? null;
}

function inferLanguage(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "typescript";
  if (lower.endsWith(".js") || lower.endsWith(".jsx")) return "javascript";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".html")) return "html";
  if (lower.endsWith(".css")) return "css";
  if (lower.endsWith(".md")) return "markdown";
  if (lower.endsWith(".vue")) return "html";
  if (lower.endsWith(".svelte")) return "html";
  return "plaintext";
}

export function WorkspaceCodeEditor({
  projectId,
  files,
  lockedPaths = [],
  readOnly = false,
  initialPath = null,
}: Props) {
  const [selectedPath, setSelectedPath] = useState<string | null>(() =>
    pickInitialPath(files, initialPath),
  );
  // `overrides` trzyma TYLKO pliki edytowane lokalnie po ostatnim zapisie.
  // Wartosc dla edytora = `overrides[path] ?? files[path].code`. Po udanym
  // zapisie override jest usuwany, wiec synchronizacja w useEffect nie jest
  // potrzebna (brak setState w effect → spelnia react-hooks/set-state-in-effect).
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  /**
   * `streamingPath` — sciezka pliku ktory AI aktualnie streamuje. Jezeli ustawione,
   * edytor automatycznie pokazuje ten plik. Czyszczone po zakonczeniu streamu
   * (przez wybitna:partial-write-end).
   */
  const [streamingPath, setStreamingPath] = useState<string | null>(null);
  /**
   * `streamingContent` — najnowsza tresc streamowanego pliku.
   * Pokazujemy ja w Monako podczas streamingu bez triggera onChange (bez zapisu).
   */
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Priorytet ścieżek: streamingPath (live) > selectedPath > pickInitialPath(files).
  // Jezeli wybrany plik znika z props (AI nadpisuje), pokazujemy automatycznie
  // pierwszy widoczny — derived, bez setState w useEffect.
  const activePath =
    streamingPath ??
    (selectedPath && files[selectedPath]
      ? selectedPath
      : pickInitialPath(files));

  // Nasluch live stream z chat-panel: AI pisze plik → ten event przychodzi z
  // kazda kolejna delta tresci. Edytor pokazuje plik na zywo + auto-przelacza
  // sie na niego, zeby uzytkownik widzial co AI buduje (UX Bolt/Cursor).
  useEffect(() => {
    function handlePartialWrite(e: Event) {
      const { path, content } = (
        e as CustomEvent<{ path: string; content: string }>
      ).detail;
      if (!path || typeof content !== "string") return;
      setStreamingPath(path);
      setStreamingContent(content);
    }
    function handleStreamEnd() {
      setStreamingPath(null);
      setStreamingContent("");
    }
    window.addEventListener("wybitna:partial-write", handlePartialWrite);
    window.addEventListener("wybitna:partial-write-end", handleStreamEnd);
    return () => {
      window.removeEventListener("wybitna:partial-write", handlePartialWrite);
      window.removeEventListener("wybitna:partial-write-end", handleStreamEnd);
    };
  }, []);

  const lockedSet = useMemo(() => new Set(lockedPaths), [lockedPaths]);
  const isLocked = activePath ? lockedSet.has(activePath) : false;

  function scheduleSave(nextOverrides: Record<string, string>) {
    if (readOnly) return;
    setSaveStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void persist(nextOverrides);
    }, SAVE_DEBOUNCE_MS);
  }

  async function persist(nextOverrides: Record<string, string>) {
    try {
      const payload: ProjectFiles = {};
      for (const [p, f] of Object.entries(files)) {
        payload[p] = {
          code: nextOverrides[p] ?? f.code,
          hidden: f.hidden,
          active: f.active,
        };
      }
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: payload }),
      });
      if (!res.ok) throw new Error("save failed");
      setSaveStatus("saved");
      setOverrides({});
      setTimeout(() => setSaveStatus("idle"), 1200);
    } catch (err) {
      console.error("Save failed", err);
      setSaveStatus("error");
    }
  }

  function handleChange(value: string | undefined) {
    if (!activePath || value === undefined) return;
    if (isLocked || readOnly) return;
    const next = { ...overrides, [activePath]: value };
    setOverrides(next);
    wcManager.writeFile(activePath, value).catch(() => {});
    scheduleSave(next);
  }

  // Wartosc dla edytora — priorytet:
  //  1. streamingContent (gdy AI aktualnie pisze ten plik),
  //  2. overrides (lokalne edycje uzytkownika),
  //  3. files (zapisane w bazie).
  const currentCode =
    activePath != null
      ? activePath === streamingPath
        ? streamingContent
        : (overrides[activePath] ?? files[activePath]?.code ?? "")
      : "";
  // Edytor jest read-only podczas streamingu AI — uzytkownik widzi live update,
  // ale nie moze edytowac (bo zmiana znikalaby po nastepnym chunku).
  const isStreamingActive = streamingPath !== null && streamingPath === activePath;

  return (
    <div className="flex h-full w-full">
      <aside className="hidden h-full w-[210px] shrink-0 border-r border-beige/10 md:block lg:w-[230px]">
        <WorkspaceFileTree
          files={files}
          activePath={activePath}
          lockedPaths={lockedPaths}
          onOpen={(p) => setSelectedPath(p)}
        />
      </aside>
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex h-8 shrink-0 items-center justify-between border-b border-beige/10 px-3 text-[11px] text-muted-foreground">
          <span className="truncate font-mono">
            {activePath ?? "—"}
            {isStreamingActive && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-amber-200/30 bg-amber-950/30 px-1.5 py-px text-[9px] uppercase tracking-wider text-amber-200">
                <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-amber-200" />
                AI pisze
              </span>
            )}
          </span>
          <SaveBadge
            status={saveStatus}
            locked={isLocked}
            readOnly={readOnly}
            streaming={isStreamingActive}
          />
        </div>
        <div className="min-h-0 flex-1">
          {activePath ? (
            <MonacoEditor
              height="100%"
              language={inferLanguage(activePath)}
              value={currentCode}
              theme="vs-dark"
              onChange={handleChange}
              options={{
                fontFamily: 'var(--font-geist-mono), "Fira Code", monospace',
                fontSize: 13,
                lineHeight: 20,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                tabSize: 2,
                readOnly: readOnly || isLocked || isStreamingActive,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                renderLineHighlight: "gutter",
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Wybierz plik z drzewa po lewej.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveBadge({
  status,
  locked,
  readOnly,
  streaming,
}: {
  status: SaveStatus;
  locked: boolean;
  readOnly: boolean;
  streaming?: boolean;
}) {
  if (streaming)
    return (
      <span className="inline-flex items-center gap-1 text-amber-200/80">
        <Loader2 className="h-3 w-3 animate-spin" /> Live z AI
      </span>
    );
  if (readOnly) return <span className="text-neutral-500">Tylko podgląd</span>;
  if (locked)
    return <span className="text-orange-300/80">Plik zablokowany</span>;
  if (status === "saving")
    return (
      <span className="inline-flex items-center gap-1 text-amber-200/80">
        <Loader2 className="h-3 w-3 animate-spin" /> Zapisuję…
      </span>
    );
  if (status === "saved")
    return (
      <span className="inline-flex items-center gap-1 text-emerald-300/80">
        <Check className="h-3 w-3" /> Zapisano
      </span>
    );
  if (status === "error")
    return <span className="text-rose-300/80">Błąd zapisu</span>;
  return null;
}
