"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { editor } from "monaco-editor";
import type { Monaco } from "@monaco-editor/react";
import { Check, Copy, Loader2, Save } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref do aktualnej funkcji recznego zapisu — uzywany przez handleEditorDidMount
  // (useCallback bez deps) zeby Ctrl+S zawsze widzial aktualny `overrides` state.
  const manualSaveRef = useRef<() => void>(() => {});

  // Monaco editor reference (live ref do executeEdits typing-anim).
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  // Tresc pliku w ostatnim renderze streamu (do append-detection).
  const prevStreamContentRef = useRef<string>("");
  // Sciezka pliku ktora byla streamowana ostatnio — reset typing-anim na zmianie pliku.
  const prevStreamPathRef = useRef<string | null>(null);
  // Czy uzytkownik recznie odscrollowal w gore (scroll-lock).
  const userScrolledRef = useRef(false);

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
      // Bezpieczne miejsce na wyczyszczenie overrides — w tym momencie
      // chat-panel.tsx juz wywolal router.refresh(), wiec swiezepropsy
      // `files` zaraz przyjda z serwera (lub sa juz w locie). Dzieki temu
      // edytor nie "cofa sie" do stałych propsow sprzed edycji.
      setOverrides({});
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

  // Emituj zmiane aktywnego pliku do globalnego eventu — WcStatusBar i ew. inne
  // komponenty (np. wskaznik kursora) moga sluchac bez prop drillingu.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("wybitna:active-file", { detail: { path: activePath } }),
    );
  }, [activePath]);

  // Konfiguracja TypeScript w Monaco — wylaczamy "czerwone falki" dla
  // sekcji ktorych Monaco nie potrafi rozwiazac (typy reactowe, lucide-react,
  // framer-motion itd.) bo te paczki sa preinstalowane w WebContainerze, a
  // nie w przegladarce. Syntax validation zostaje wlaczony — to wykryje
  // realne bledy gramatyczne (brak nawiasu, missing semicolon).
  const handleEditorWillMount = useCallback((monaco: Monaco) => {
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: true,
    });
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: true,
    });
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2022,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      allowNonTsExtensions: true,
      isolatedModules: true,
      strict: false,
    });
  }, []);

  // Mount handler — zapisuje editorRef, podpina onDidScrollChange dla scroll-lock
  // i rejestruje skrot Ctrl+S.
  const handleEditorDidMount = useCallback(
    (instance: editor.IStandaloneCodeEditor, monacoInstance: Monaco) => {
      editorRef.current = instance;

      // Scroll-lock: jezeli uzytkownik scrolluje wyzej niz dol minus 80px,
      // wylaczamy auto-scroll przy nowych chunkach.
      instance.onDidScrollChange(() => {
        const top = instance.getScrollTop();
        const height = instance.getScrollHeight();
        const layout = instance.getLayoutInfo();
        const maxTop = Math.max(0, height - layout.height);
        userScrolledRef.current = top < maxTop - 80;
      });

      // Ctrl+S (lub Cmd+S na Mac) — reczny zapis bez czekania na debounce.
      // Uzywa manualSaveRef zamiast bezposrednio handleManualSave, zeby
      // useCallback nie musialo sie rebindowac przy kazdej zmianie overrides.
      instance.addCommand(
        monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
        () => manualSaveRef.current(),
      );
    },
    [],
  );

  // Typing-animation: gdy AI streamuje plik, zamiast `value={streamingContent}`
  // (ktore powoduje full re-render Monaco — caly model.setValue), korzystamy
  // z editor.executeEdits z append delta. Daje to klasyczny efekt pisania
  // "litera po literze" znany z Bolt/Cursor. Reset prevContentRef kiedy:
  // - zmienia sie streamingPath (nowy plik),
  // - tresc nie jest append-only (patchFile lub overwrite).
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || !streamingPath || streamingPath !== activePath) return;
    const model = ed.getModel();
    if (!model) return;

    const pathChanged = prevStreamPathRef.current !== streamingPath;
    if (pathChanged) {
      prevStreamPathRef.current = streamingPath;
      prevStreamContentRef.current = "";
      model.setValue("");
    }

    const prev = prevStreamContentRef.current;
    if (
      !pathChanged &&
      streamingContent.startsWith(prev) &&
      streamingContent.length > prev.length
    ) {
      const delta = streamingContent.slice(prev.length);
      const lastLine = model.getLineCount();
      const lastCol = model.getLineMaxColumn(lastLine);
      ed.executeEdits("ai-stream", [
        {
          range: {
            startLineNumber: lastLine,
            startColumn: lastCol,
            endLineNumber: lastLine,
            endColumn: lastCol,
          },
          text: delta,
          forceMoveMarkers: true,
        },
      ]);
      if (!userScrolledRef.current) {
        ed.revealLine(model.getLineCount());
      }
    } else if (streamingContent !== prev) {
      model.setValue(streamingContent);
      if (!userScrolledRef.current) {
        ed.revealLine(model.getLineCount());
      }
    }
    prevStreamContentRef.current = streamingContent;
  }, [streamingContent, streamingPath, activePath]);

  // Reset typing-animation state po zakonczeniu streamu (event-driven).
  useEffect(() => {
    if (!streamingPath) {
      prevStreamContentRef.current = "";
      prevStreamPathRef.current = null;
      userScrolledRef.current = false;
    }
  }, [streamingPath]);

  // Definicja handleCopyCode ponizej (po obliczeniu currentCode).

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
      // NIE czyscimy tutaj setOverrides({}) — `files` props sa nadal stale
      // (router.refresh() nie jest wywolywany po recznym zapisie). Gdybysmy
      // wyczyscili overrides, currentCode cofnelby sie do starego files[path].code
      // i edycja "zniknelaby" wizualnie (bug: edyty znikaja po zapisie).
      // Overrides sa czyszczone w handleStreamEnd po zakonczeniu generacji AI
      // (wtedy router.refresh() juz zaktualizowal propsy).
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

  /**
   * Reczny zapis — uzywany przez przycisk "Zapisz" i skrot Ctrl+S.
   * Anuluje oczekujacy debounce i od razu wywoluje persist.
   */
  function handleManualSave() {
    if (readOnly) return;
    if (Object.keys(overrides).length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void persist(overrides);
  }
  // Synchronizuj ref z aktualnym handleManualSave przy kazdym renderze.
  // useCallback w handleEditorDidMount uzywa tego refa zeby Ctrl+S
  // zawsze widzial swiezy `overrides` i `readOnly` bez re-bindowania komendy.
  manualSaveRef.current = handleManualSave;

  // Wartosc dla edytora — priorytet:
  //  1. streaming (gdy AI aktualnie pisze ten plik) — tresc steruje useEffect
  //     przez executeEdits, prop `value` zostaje ustawiony tylko na pierwszy
  //     chunk; pozniejsze zmiany pomijaja React (zeby uniknac full re-render).
  //  2. overrides (lokalne edycje uzytkownika),
  //  3. files (zapisane w bazie).
  const isStreamingActive = streamingPath !== null && streamingPath === activePath;
  const currentCode =
    activePath != null
      ? isStreamingActive
        ? streamingContent
        : (overrides[activePath] ?? files[activePath]?.code ?? "")
      : "";

  const handleCopyCode = useCallback(async () => {
    if (!activePath) return;
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.warn("clipboard failed", err);
    }
  }, [activePath, currentCode]);

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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopyCode}
              disabled={!activePath}
              className="inline-flex h-5 items-center gap-1 rounded border border-beige/15 bg-card/30 px-1.5 text-[10px] uppercase tracking-wider text-foreground/70 transition hover:border-beige/30 hover:bg-white/5 hover:text-beige disabled:cursor-not-allowed disabled:opacity-50"
              title="Kopiuj caly plik"
            >
              {copied ? (
                <>
                  <Check className="h-2.5 w-2.5" />
                  Skopiowano
                </>
              ) : (
                <>
                  <Copy className="h-2.5 w-2.5" />
                  Kopiuj plik
                </>
              )}
            </button>
            {/* Przycisk "Zapisz" — widoczny gdy sa niezapisane zmiany. */}
            {!readOnly && !isLocked && Object.keys(overrides).length > 0 && (
              <button
                type="button"
                onClick={handleManualSave}
                disabled={saveStatus === "saving"}
                className="inline-flex h-5 items-center gap-1 rounded border border-beige/40 bg-beige/10 px-1.5 text-[10px] uppercase tracking-wider text-beige transition hover:bg-beige/20 disabled:opacity-50"
                title="Zapisz (Ctrl+S)"
              >
                <Save className="h-2.5 w-2.5" />
                Zapisz
              </button>
            )}
            <SaveBadge
              status={saveStatus}
              locked={isLocked}
              readOnly={readOnly}
              streaming={isStreamingActive}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1">
          {activePath ? (
            <MonacoEditor
              height="100%"
              language={inferLanguage(activePath)}
              value={isStreamingActive ? undefined : currentCode}
              theme="vs-dark"
              onChange={handleChange}
              beforeMount={handleEditorWillMount}
              onMount={handleEditorDidMount}
              path={activePath}
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
                // Wylacz "Cannot find name" itd. dla edytora — pelna walidacja
                // zachodzi w WebContainerze podczas Vite dev-server.
                quickSuggestions: { other: true, comments: false, strings: false },
                renderValidationDecorations: "off",
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
