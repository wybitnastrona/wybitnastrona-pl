"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { wcManager } from "./wc-manager";
import type { ProjectFiles } from "@/lib/types/project";

type Props = {
  projectId: string;
  files: ProjectFiles;
  /** Komenda uruchamiająca dev server, np `npm run dev`. */
  runCommand?: { cmd: string; args: string[] };
  /** Callback z URL preview (gdy server-ready). */
  onServerReady?: (url: string) => void;
  /** Czy ukryć overlay statusu (gdy iframe jest osadzony zewnętrznie). */
  hideStatusOverlay?: boolean;
};

type Status =
  | "idle"
  | "booting"
  | "mounting"
  | "installing"
  | "running"
  | "error";

export function WCRuntime({
  projectId,
  files,
  runCommand,
  onServerReady,
  hideStatusOverlay = false,
}: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(() =>
    wcManager.getCurrentProjectId() === projectId
      ? wcManager.getServerUrl()
      : null,
  );
  const prevFilesRef = useRef<ProjectFiles | null>(null);

  useEffect(() => {
    let cancelled = false;
    const off = wcManager.on((ev) => {
      if (cancelled) return;
      if (ev.type === "boot") {
        setStatus(ev.status === "ready" ? "mounting" : "booting");
      } else if (ev.type === "install") {
        setStatus(
          ev.status === "running"
            ? "installing"
            : ev.status === "error"
              ? "error"
              : "running",
        );
      } else if (ev.type === "server") {
        setPreviewUrl(ev.url);
        setStatus("running");
        onServerReady?.(ev.url);
      }
    });

    (async () => {
      try {
        await wcManager.loadProject(projectId, files, runCommand);
        prevFilesRef.current = files;
      } catch (err) {
        console.error("WC load error", err);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Hot-reload: gdy AI zakończy generowanie i `files` się zmieni, zapisujemy
  // tylko zmienione pliki w wirtualnym FS WC. Vite HMR przeładuje moduły.
  useEffect(() => {
    const prev = prevFilesRef.current;
    if (!prev) return;

    const changed = Object.entries(files).filter(
      ([path, f]) => prev[path]?.code !== f.code,
    );
    if (changed.length === 0) return;

    (async () => {
      for (const [path, f] of changed) {
        await wcManager.writeFile(path, f.code);
      }
      prevFilesRef.current = files;
    })().catch((err) => console.error("WC hot-reload error", err));
  }, [files]);

  useEffect(() => {
    function handlePartialWrite(e: Event) {
      const { path, content } = (e as CustomEvent<{ path: string; content: string }>)
        .detail;
      wcManager.writeFile(path, content).catch(() => {});
    }
    window.addEventListener("wybitna:partial-write", handlePartialWrite);
    return () => {
      window.removeEventListener("wybitna:partial-write", handlePartialWrite);
    };
  }, []);

  return (
    <div className="relative h-full w-full bg-white">
      {previewUrl ? (
        <iframe
          src={previewUrl}
          title="Preview"
          className="h-full w-full border-0"
          allow="cross-origin-isolated"
        />
      ) : (
        !hideStatusOverlay && (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {statusLabel(status)}
          </div>
        )
      )}
    </div>
  );
}

function statusLabel(s: Status): string {
  switch (s) {
    case "booting":
      return "Uruchamiam WebContainer…";
    case "mounting":
      return "Montuję projekt…";
    case "installing":
      return "Instaluję zależności (npm install)…";
    case "running":
      return "Startuję serwer…";
    case "error":
      return "Błąd uruchomienia. Sprawdź konsolę.";
    default:
      return "Inicjalizacja…";
  }
}
