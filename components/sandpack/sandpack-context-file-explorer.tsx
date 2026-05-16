"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useSandpack } from "@codesandbox/sandpack-react";
import {
  ChevronRight,
  Crosshair,
  File,
  Folder,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MenuState =
  | {
      kind: "file";
      x: number;
      y: number;
      path: string;
    }
  | {
      kind: "dir";
      x: number;
      y: number;
      prefix: string;
    }
  | {
      kind: "empty";
      x: number;
      y: number;
    };

type DirNode = {
  name: string;
  /** e.g. "/components" - empty string for synthetic root */
  prefix: string;
  subdirs: Map<string, DirNode>;
  files: { name: string; path: string }[];
};

function emptyDir(name: string, prefix: string): DirNode {
  return { name, prefix, subdirs: new Map(), files: [] };
}

function insertPath(root: DirNode, fullPath: string): void {
  const parts = fullPath.split("/").filter(Boolean);
  if (parts.length === 0) return;
  if (parts.length === 1) {
    root.files.push({ name: parts[0], path: fullPath.startsWith("/") ? fullPath : `/${fullPath}` });
    root.files.sort((a, b) => a.name.localeCompare(b.name));
    return;
  }
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const seg = parts[i];
    const prefix = `/${parts.slice(0, i + 1).join("/")}`;
    if (!cur.subdirs.has(seg)) {
      cur.subdirs.set(seg, emptyDir(seg, prefix));
    }
    cur = cur.subdirs.get(seg)!;
  }
  const fileName = parts[parts.length - 1];
  const pathNorm = fullPath.startsWith("/") ? fullPath : `/${fullPath}`;
  cur.files.push({ name: fileName, path: pathNorm });
  cur.files.sort((a, b) => a.name.localeCompare(b.name));
}

function buildTree(paths: string[]): DirNode {
  const root = emptyDir("", "");
  const sorted = [...new Set(paths)].sort((a, b) => a.localeCompare(b));
  for (const p of sorted) {
    insertPath(root, p);
  }
  return root;
}

function getFileCode(
  files: Record<string, { code?: string } | string>,
  path: string,
): string {
  const f = files[path];
  if (!f) return "";
  if (typeof f === "string") return f;
  return typeof f.code === "string" ? f.code : "";
}

function ExplorerContextMenu({
  state,
  onClose,
  children,
}: {
  state: MenuState;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pad = 8;
    const rect = el.getBoundingClientRect();
    let left = state.x;
    let top = state.y;
    if (left + rect.width > window.innerWidth - pad) {
      left = window.innerWidth - rect.width - pad;
    }
    if (top + rect.height > window.innerHeight - pad) {
      top = window.innerHeight - rect.height - pad;
    }
    el.style.left = `${Math.max(pad, left)}px`;
    el.style.top = `${Math.max(pad, top)}px`;
  }, [state]);

  const node = (
    <div
      ref={ref}
      className="fixed z-[200] min-w-[200px] rounded-md border border-beige/15 bg-[#1a1a1a] py-1 text-sm shadow-xl"
      style={{ left: state.x, top: state.y }}
      role="menu"
    >
      {children}
    </div>
  );

  if (typeof document === "undefined") return node;
  return createPortal(node, document.body);
}

function MenuBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-neutral-200 transition-colors",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "cursor-pointer hover:bg-white/10 hover:text-beige",
      )}
      onClick={() => {
        if (!disabled) onClick();
      }}
    >
      {children}
    </button>
  );
}

function MenuSep() {
  return <div className="my-1 h-px bg-beige/10" />;
}

export type SandpackContextFileExplorerProps = {
  projectId?: string;
  readOnly?: boolean;
  /** „Wskaż wszystko” - włącza tryb wyboru elementu w podglądzie (jak na screenie: Target all). */
  onTargetAll?: () => void;
} & HTMLAttributes<HTMLDivElement>;

export function SandpackContextFileExplorer({
  projectId,
  readOnly = false,
  onTargetAll,
  className,
  style,
  ...rest
}: SandpackContextFileExplorerProps) {
  const { sandpack } = useSandpack();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState<MenuState | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const paths = useMemo(
    () => Object.keys(sandpack.files ?? {}).filter((p) => p.length > 0),
    [sandpack.files],
  );

  const tree = useMemo(() => buildTree(paths), [paths]);

  const closeMenu = useCallback(() => setMenu(null), []);

  const defaultExpanded = useCallback((node: DirNode) => {
    const key = node.prefix || "__root__";
    if (expanded[key] !== undefined) return expanded[key];
    return true;
  }, [expanded]);

  const toggleDir = (prefix: string) => {
    const key = prefix || "__root__";
    setExpanded((e) => ({ ...e, [key]: !(e[key] ?? true) }));
  };

  const promptPath = (title: string, initial: string): string | null => {
    const v = window.prompt(title, initial);
    if (v == null || !v.trim()) return null;
    let p = v.trim().replace(/\\/g, "/");
    if (!p.startsWith("/")) p = `/${p}`;
    return p;
  };

  const handleNewFile = (folderPrefix: string) => {
    closeMenu();
    const initial =
      folderPrefix && folderPrefix !== "/"
        ? `${folderPrefix.endsWith("/") ? folderPrefix.slice(0, -1) : folderPrefix}/Nowy.tsx`
        : "/Nowy.tsx";
    const path = promptPath("Ścieżka nowego pliku (np. /components/Card.tsx)", initial);
    if (!path) return;
    sandpack.updateFile(path, "// nowy plik\n", true);
    sandpack.openFile(path);
  };

  const handleNewFolder = (folderPrefix: string) => {
    closeMenu();
    const initial =
      folderPrefix && folderPrefix !== "/"
        ? `${folderPrefix.replace(/\/$/, "")}/MojFolder`
        : "/MojFolder";
    const folder = promptPath("Ścieżka folderu (np. /assets)", initial);
    if (!folder) return;
    const keep = `${folder.replace(/\/$/, "")}/.gitkeep`;
    sandpack.updateFile(keep, "# folder\n", true);
  };

  const copyPath = (path: string) => {
    void navigator.clipboard.writeText(path);
    closeMenu();
  };

  const copyRel = (path: string) => {
    const rel = path.startsWith("/") ? path.slice(1) : path;
    void navigator.clipboard.writeText(rel);
    closeMenu();
  };

  const handleCopyFileBody = (path: string) => {
    const code = getFileCode(sandpack.files as Record<string, { code?: string }>, path);
    void navigator.clipboard.writeText(code);
    closeMenu();
  };

  const handleCut = (path: string) => {
    const code = getFileCode(sandpack.files as Record<string, { code?: string }>, path);
    if (
      !window.confirm(
        `Wytnąć plik ${path}? Zawartość trafi do schowka, plik zostanie usunięty z projektu.`,
      )
    ) {
      closeMenu();
      return;
    }
    void navigator.clipboard.writeText(code);
    sandpack.deleteFile(path, true);
    closeMenu();
  };

  const handleDelete = (path: string) => {
    if (path === "/index.html" || path === "/index.tsx") {
      window.alert("Nie można usunąć plików startowych (/index.html, /index.tsx).");
      closeMenu();
      return;
    }
    if (!window.confirm(`Usunąć plik ${path}?`)) {
      closeMenu();
      return;
    }
    sandpack.deleteFile(path, true);
    closeMenu();
  };

  const handleRename = (path: string) => {
    const next = promptPath("Nowa ścieżka pliku", path);
    if (!next || next === path) {
      closeMenu();
      return;
    }
    if (next === "/index.html" || next === "/index.tsx") {
      window.alert("Ta nazwa jest zarezerwowana dla plików startowych.");
      closeMenu();
      return;
    }
    const code = getFileCode(sandpack.files as Record<string, { code?: string }>, path);
    sandpack.updateFile(next, code, true);
    sandpack.deleteFile(path, true);
    sandpack.openFile(next);
    closeMenu();
  };

  const handleLockAll = async () => {
    closeMenu();
    if (!projectId) return;
    const lockable = paths.filter((p) => p !== "/index.html" && p !== "/index.tsx");
    if (lockable.length === 0) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/locked-files`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lockedFiles: lockable }),
      });
      if (!res.ok) throw new Error();
      window.dispatchEvent(new CustomEvent("wybitna:locked-files-changed"));
    } catch {
      window.alert("Nie udało się zablokować plików.");
    }
  };

  const handleTargetAll = () => {
    closeMenu();
    onTargetAll?.();
  };

  const onExplorerContextMenu: HTMLAttributes<HTMLDivElement>["onContextMenu"] = (
    e,
  ) => {
    if (readOnly) return;
    const el = e.target as HTMLElement;
    if (el.closest("[data-sp-path]") || el.closest("[data-sp-dir]")) return;
    e.preventDefault();
    setMenu({ kind: "empty", x: e.clientX, y: e.clientY });
  };

  const renderDir = (node: DirNode): ReactNode => {
    const key = node.prefix || "__root__";
    const isOpen = defaultExpanded(node);
    const subEntries = [...node.subdirs.entries()].sort(([a], [b]) => a.localeCompare(b));

    // Folder naglowek (NIE dla synthetic root).
    const header = node.name ? (
      <div
        role="button"
        tabIndex={0}
        data-sp-dir="1"
        className="flex cursor-pointer items-center gap-0.5 py-0.5 pr-1 text-[13px] text-neutral-300 hover:bg-white/5 hover:text-beige"
        style={{ paddingLeft: 6 }}
        onClick={() => toggleDir(node.prefix)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleDir(node.prefix);
          }
        }}
        onContextMenu={(e) => {
          if (readOnly) return;
          e.preventDefault();
          e.stopPropagation();
          setMenu({
            kind: "dir",
            x: e.clientX,
            y: e.clientY,
            prefix: node.prefix,
          });
        }}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-neutral-500 transition-transform",
            isOpen && "rotate-90",
          )}
        />
        <Folder className="h-3.5 w-3.5 shrink-0 text-beige/70" />
        <span className="truncate">{node.name}</span>
      </div>
    ) : null;

    // Dzieci folderu - pionowa linia po lewej + staly paddingLeft.
    // ml-[13px] wyrownuje linie z ikona Folder w naglowku rodzica (chevron 14px + 0.5 gap).
    const children = (!node.name || isOpen) && (
      <div
        className={cn(
          node.name && "relative ml-[13px] border-l border-white/10",
        )}
      >
        {node.files.map((f) => (
          <div
            key={f.path}
            role="button"
            tabIndex={0}
            data-sp-path={f.path}
            className={cn(
              "flex cursor-pointer items-center gap-1 py-0.5 pr-1 text-[13px] hover:bg-white/5",
              sandpack.activeFile === f.path
                ? "bg-beige/15 text-beige"
                : "text-neutral-300",
            )}
            style={{ paddingLeft: node.name ? 12 : 6 }}
            onClick={() => sandpack.openFile(f.path)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                sandpack.openFile(f.path);
              }
            }}
            onContextMenu={(e) => {
              if (readOnly) return;
              e.preventDefault();
              e.stopPropagation();
              setMenu({ kind: "file", x: e.clientX, y: e.clientY, path: f.path });
            }}
          >
            <File className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className="truncate">{f.name}</span>
          </div>
        ))}
        {subEntries.map(([, child]) => renderDir(child))}
      </div>
    );

    return (
      <div key={key} className="select-none">
        {header}
        {children}
      </div>
    );
  };

  return (
    <div
      ref={rootRef}
      className={cn("h-full overflow-auto bg-[#0a0a0a] py-1 text-left font-mono text-[13px]", className)}
      style={style}
      {...rest}
      onContextMenu={onExplorerContextMenu}
    >
      {renderDir(tree)}

      {menu?.kind === "empty" && (
        <ExplorerContextMenu state={menu} onClose={closeMenu}>
          <MenuBtn
            disabled={readOnly}
            onClick={() => handleNewFile("")}
          >
            Nowy plik…
          </MenuBtn>
          <MenuBtn
            disabled={readOnly}
            onClick={() => handleNewFolder("")}
          >
            Nowy folder…
          </MenuBtn>
          <MenuSep />
          <MenuBtn onClick={() => copyPath("/")}>Kopiuj ścieżkę</MenuBtn>
          <MenuBtn onClick={() => copyRel("/")}>Kopiuj ścieżkę względną</MenuBtn>
        </ExplorerContextMenu>
      )}

      {menu?.kind === "dir" && (
        <ExplorerContextMenu state={menu} onClose={closeMenu}>
          <MenuBtn
            disabled={readOnly}
            onClick={() => handleNewFile(menu.prefix)}
          >
            Nowy plik…
          </MenuBtn>
          <MenuBtn
            disabled={readOnly}
            onClick={() => handleNewFolder(menu.prefix)}
          >
            Nowy folder…
          </MenuBtn>
          <MenuSep />
          <MenuBtn
            disabled={!onTargetAll}
            onClick={handleTargetAll}
          >
            <Crosshair className="h-3.5 w-3.5" />
            Wskaż w podglądzie
          </MenuBtn>
          <MenuBtn
            disabled={readOnly || !projectId}
            onClick={() => void handleLockAll()}
          >
            <Lock className="h-3.5 w-3.5" />
            Zablokuj wszystkie
          </MenuBtn>
          <MenuSep />
          <MenuBtn onClick={() => copyPath(menu.prefix || "/")}>Kopiuj ścieżkę</MenuBtn>
          <MenuBtn onClick={() => copyRel(menu.prefix || "/")}>Kopiuj ścieżkę względną</MenuBtn>
        </ExplorerContextMenu>
      )}

      {menu?.kind === "file" && (
        <ExplorerContextMenu state={menu} onClose={closeMenu}>
          <MenuBtn
            disabled={readOnly}
            onClick={() => {
              const dir = menu.path.replace(/\/[^/]+$/, "") || "";
              handleNewFile(dir);
            }}
          >
            Nowy plik…
          </MenuBtn>
          <MenuBtn
            disabled={readOnly}
            onClick={() => {
              const dir = menu.path.replace(/\/[^/]+$/, "") || "";
              handleNewFolder(dir);
            }}
          >
            Nowy folder…
          </MenuBtn>
          <MenuSep />
          <MenuBtn
            disabled={!onTargetAll}
            onClick={handleTargetAll}
          >
            <Crosshair className="h-3.5 w-3.5" />
            Wskaż w podglądzie
          </MenuBtn>
          <MenuBtn
            disabled={readOnly || !projectId}
            onClick={() => void handleLockAll()}
          >
            <Lock className="h-3.5 w-3.5" />
            Zablokuj wszystkie
          </MenuBtn>
          <MenuSep />
          <MenuBtn
            disabled={readOnly}
            onClick={() => handleCut(menu.path)}
          >
            Wytnij
          </MenuBtn>
          <MenuBtn onClick={() => handleCopyFileBody(menu.path)}>Kopiuj</MenuBtn>
          <MenuSep />
          <MenuBtn onClick={() => copyPath(menu.path)}>Kopiuj ścieżkę</MenuBtn>
          <MenuBtn onClick={() => copyRel(menu.path)}>Kopiuj ścieżkę względną</MenuBtn>
          <MenuSep />
          <MenuBtn
            disabled={readOnly}
            onClick={() => handleRename(menu.path)}
          >
            Zmień nazwę…
          </MenuBtn>
          <MenuBtn
            disabled={readOnly}
            onClick={() => handleDelete(menu.path)}
          >
            Usuń
          </MenuBtn>
        </ExplorerContextMenu>
      )}
    </div>
  );
}
