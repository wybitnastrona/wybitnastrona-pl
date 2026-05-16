"use client";

import { useMemo, useState } from "react";
import { Check, Copy, FolderOpen, ImageIcon } from "lucide-react";
import type { ProjectFiles } from "@/lib/types/project";

type Props = {
  files: ProjectFiles;
};

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"];

function isImagePath(path: string): boolean {
  const lower = path.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function publicPath(filesPath: string): string {
  // /public/images/foo.png -> /images/foo.png (Vite serwuje /public na rootcie)
  return filesPath.replace(/^\/public/, "");
}

function inferThumbnail(path: string, code: string): string | null {
  // Jezeli plik to URL (np. AI zapisalo "https://...png" jako tresc), zwroc go.
  const trimmed = code.trim();
  if (/^https?:\/\//i.test(trimmed) && trimmed.length < 2000) {
    return trimmed.split(/\s+/)[0];
  }
  // Jezeli plik to SVG inline (zaczyna sie od <svg), zrob data URL.
  if (trimmed.startsWith("<svg")) {
    try {
      return `data:image/svg+xml;utf8,${encodeURIComponent(trimmed)}`;
    } catch {
      return null;
    }
  }
  // Pozostale (bin/PNG zapisane jako binary blob) - pokaz nazwe.
  void path;
  return null;
}

/**
 * Asset Manager - listuje pliki w /public/images/ (Vite serwuje z /images/).
 * Pokazuje thumbnail (jezeli mozliwy), nazwe, sciezke publiczna i copy-to-clipboard.
 */
export function AssetManager({ files }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const assets = useMemo(() => {
    return Object.entries(files)
      .filter(([path]) => path.startsWith("/public/images/"))
      .filter(([path]) => !path.endsWith("/.gitkeep"))
      .filter(([path]) => isImagePath(path))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, file]) => ({
        path,
        publicPath: publicPath(path),
        name: path.split("/").pop() ?? path,
        thumbnail: inferThumbnail(path, file.code),
      }));
  }, [files]);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 1500);
    } catch (err) {
      console.warn("clipboard failed", err);
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-beige/10 px-4 text-xs text-muted-foreground">
        <FolderOpen className="h-3.5 w-3.5 text-beige/70" />
        <span className="font-mono">/public/images/</span>
        <span className="text-foreground/40">·</span>
        <span>{assets.length} {assets.length === 1 ? "plik" : "plikow"}</span>
      </div>

      {assets.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto p-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {assets.map((asset) => (
            <article
              key={asset.path}
              className="group flex flex-col overflow-hidden rounded-lg border border-beige/10 bg-card/40 transition hover:border-beige/30"
            >
              <div className="relative flex aspect-square items-center justify-center bg-[#0a0a0a]">
                {asset.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.thumbnail}
                    alt={asset.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-beige/30" />
                )}
              </div>
              <div className="flex flex-col gap-1 p-2">
                <div className="truncate text-[11px] font-medium text-foreground">
                  {asset.name}
                </div>
                <button
                  type="button"
                  onClick={() => copy(asset.publicPath)}
                  className="inline-flex h-6 items-center justify-center gap-1 rounded border border-beige/15 bg-background/40 text-[10px] text-muted-foreground transition hover:border-beige/30 hover:text-beige"
                  title={`Kopiuj sciezke ${asset.publicPath}`}
                >
                  {copied === asset.publicPath ? (
                    <>
                      <Check className="h-2.5 w-2.5" />
                      Skopiowano
                    </>
                  ) : (
                    <>
                      <Copy className="h-2.5 w-2.5" />
                      <span className="font-mono">{asset.publicPath}</span>
                    </>
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-beige/15 bg-card/40 text-beige/50">
        <ImageIcon className="h-7 w-7" />
      </div>
      <h3 className="text-sm font-medium text-foreground">
        Folder /public/images/ jest pusty
      </h3>
      <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
        AI może tu zapisac statyczne grafiki (logo SVG, ikony manifestu).
        Wstaw je do swojej strony przez{" "}
        <span className="font-mono text-beige/70">
          &lt;img src=&quot;/images/nazwa.svg&quot;&gt;
        </span>
        . Dla dynamicznych zdjec (hero, sekcje) uzywaj{" "}
        <span className="font-mono text-beige/70">generateImage()</span> -
        zwraca URL z Cloudinary.
      </p>
    </div>
  );
}
