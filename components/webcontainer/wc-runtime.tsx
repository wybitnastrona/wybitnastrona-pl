"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { wcManager } from "./wc-manager";
import type { ProjectFiles } from "@/lib/types/project";

type Props = {
  files: ProjectFiles;
  /** Komenda uruchamiajaca dev server, np `npm run dev`. Pomin gdy template tego nie potrzebuje. */
  runCommand?: { cmd: string; args: string[] };
  /** Callback z URL preview (gdy server-ready). */
  onServerReady?: (url: string) => void;
};

type Status =
  | "idle"
  | "booting"
  | "mounting"
  | "installing"
  | "running"
  | "error";

export function WCRuntime({ files, runCommand, onServerReady }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    wcManager.getServerUrl(),
  );

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
        await wcManager.loadProject(files, runCommand);
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
  }, []);

  return (
    <div className="relative h-full w-full bg-[#0a0a0a]">
      {previewUrl ? (
        <iframe
          src={previewUrl}
          title="Preview"
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {statusLabel(status)}
        </div>
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
