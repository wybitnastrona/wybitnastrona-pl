"use client";

import { useMemo, useState, type HTMLAttributes } from "react";
import { ChevronRight, File as FileIcon, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectFiles } from "@/lib/types/project";

type DirNode = {
  name: string;
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
  const pathNorm = fullPath.startsWith("/") ? fullPath : `/${fullPath}`;
  if (parts.length === 1) {
    root.files.push({ name: parts[0], path: pathNorm });
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
  cur.files.push({ name: fileName, path: pathNorm });
  cur.files.sort((a, b) => a.name.localeCompare(b.name));
}

function buildTree(paths: string[]): DirNode {
  const root = emptyDir("", "");
  const sorted = [...new Set(paths)].sort((a, b) => a.localeCompare(b));
  for (const p of sorted) insertPath(root, p);
  return root;
}

type Props = {
  files: ProjectFiles;
  activePath: string | null;
  onOpen: (path: string) => void;
  /** Pliki zablokowane (read-only) — wyświetlamy z innym kolorem. */
  lockedPaths?: string[];
} & HTMLAttributes<HTMLDivElement>;

export function WorkspaceFileTree({
  files,
  activePath,
  onOpen,
  lockedPaths = [],
  className,
  ...rest
}: Props) {
  const visible = useMemo(
    () =>
      Object.entries(files)
        .filter(([, f]) => !f.hidden)
        .map(([p]) => p),
    [files],
  );
  const tree = useMemo(() => buildTree(visible), [visible]);
  const lockedSet = useMemo(() => new Set(lockedPaths), [lockedPaths]);

  return (
    <div
      className={cn(
        "h-full overflow-y-auto px-1.5 py-2 text-[12.5px] text-neutral-300",
        className,
      )}
      {...rest}
    >
      <DirView
        node={tree}
        depth={0}
        activePath={activePath}
        onOpen={onOpen}
        lockedSet={lockedSet}
      />
    </div>
  );
}

function DirView({
  node,
  depth,
  activePath,
  onOpen,
  lockedSet,
}: {
  node: DirNode;
  depth: number;
  activePath: string | null;
  onOpen: (path: string) => void;
  lockedSet: Set<string>;
}) {
  const subdirs = [...node.subdirs.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div>
      {subdirs.map((dir) => (
        <DirRow
          key={dir.prefix}
          dir={dir}
          depth={depth}
          activePath={activePath}
          onOpen={onOpen}
          lockedSet={lockedSet}
        />
      ))}
      {node.files.map((f) => (
        <FileRow
          key={f.path}
          path={f.path}
          name={f.name}
          depth={depth}
          active={f.path === activePath}
          locked={lockedSet.has(f.path)}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function DirRow({
  dir,
  depth,
  activePath,
  onOpen,
  lockedSet,
}: {
  dir: DirNode;
  depth: number;
  activePath: string | null;
  onOpen: (path: string) => void;
  lockedSet: Set<string>;
}) {
  const [open, setOpen] = useState(depth < 1);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-white/5"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <ChevronRight
          className={cn(
            "h-3 w-3 shrink-0 text-neutral-500 transition-transform",
            open && "rotate-90",
          )}
        />
        <Folder className="h-3.5 w-3.5 shrink-0 text-beige/70" />
        <span className="truncate">{dir.name}</span>
      </button>
      {open && (
        <DirView
          node={dir}
          depth={depth + 1}
          activePath={activePath}
          onOpen={onOpen}
          lockedSet={lockedSet}
        />
      )}
    </div>
  );
}

function FileRow({
  path,
  name,
  depth,
  active,
  locked,
  onOpen,
}: {
  path: string;
  name: string;
  depth: number;
  active: boolean;
  locked: boolean;
  onOpen: (path: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(path)}
      className={cn(
        "flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left",
        active
          ? "bg-beige/15 text-beige"
          : "hover:bg-white/5 hover:text-beige",
      )}
      style={{ paddingLeft: `${depth * 12 + 18}px` }}
      title={path}
    >
      <FileIcon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          locked ? "text-orange-400/70" : "text-neutral-500",
        )}
      />
      <span className="truncate">{name}</span>
    </button>
  );
}
