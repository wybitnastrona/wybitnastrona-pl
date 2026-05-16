"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { wcManager } from "./wc-manager";
import type { ProjectFiles } from "@/lib/types/project";
import { sanitizeProjectPackageJson } from "@/lib/sandpack/merge-preview-files";

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

type DeployStatus = "idle" | "building" | "uploading" | "done" | "error";

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
  const [deployStatus, setDeployStatus] = useState<DeployStatus>("idle");
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
        // Napraw package.json przed mounted do WC — stare projekty moga miec
        // JSON z trailing commas wygenerowanymi przez AI. npm install pada z
        // EJSONPARSE bez tej sanitizacji.
        const safeFiles = sanitizeProjectPackageJson(files);
        await wcManager.loadProject(projectId, safeFiles, runCommand);
        prevFilesRef.current = safeFiles;
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

    // Aktualizuj ref SYNCHRONICZNIE przed petla async — dziala jako "lock"
    // zapobiegajacy ponownemu wejsciu do efektu gdy React StrictMode lub
    // szybkie re-rendery wywolaja go ponownie zanim pierwsza petla skonczy
    // pisac pliki. Bez tego `package.json` (i inne pliki) sa wgrywane
    // wielokrotnie, co powoduje kaskadowe reloady w Vite.
    prevFilesRef.current = files;

    (async () => {
      for (const [path, f] of changed) {
        await wcManager.writeFile(path, f.code);
      }
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

  // Nasłuchuje zdarzenia wybitna:deploy-static (emitowanego przez project-topbar
  // po udanej publikacji). Uruchamia `npm run build` i uploaduje dist/ do Storage.
  useEffect(() => {
    async function handleDeploy(e: Event) {
      const { projectId: targetId } = (
        e as CustomEvent<{ projectId: string }>
      ).detail;
      if (targetId !== projectId) return;
      if (!runCommand) return; // nie ma WebContainera, pomiń

      setDeployStatus("building");
      const logs: string[] = [];

      const exitCode = await wcManager
        .runBuild((line) => logs.push(line))
        .catch(() => 1);

      if (exitCode !== 0) {
        console.warn("[deploy] npm run build failed. Logs:", logs.join("\n"));
        setDeployStatus("error");
        window.dispatchEvent(
          new CustomEvent("wybitna:static-deploy-done", {
            detail: { projectId, ok: false, error: "Build failed" },
          }),
        );
        setTimeout(() => setDeployStatus("idle"), 4000);
        return;
      }

      setDeployStatus("uploading");
      const distFiles = await wcManager.readDistFiles().catch(() => ({}));

      if (Object.keys(distFiles).length === 0) {
        console.warn("[deploy] No files in dist/. Build may have failed.");
        setDeployStatus("error");
        setTimeout(() => setDeployStatus("idle"), 4000);
        return;
      }

      try {
        const res = await fetch(`/api/projects/${projectId}/deploy-static`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: distFiles }),
        });
        if (res.ok) {
          setDeployStatus("done");
          window.dispatchEvent(
            new CustomEvent("wybitna:static-deploy-done", {
              detail: { projectId, ok: true },
            }),
          );
        } else {
          setDeployStatus("error");
        }
      } catch {
        setDeployStatus("error");
      }
      setTimeout(() => setDeployStatus("idle"), 5000);
    }

    window.addEventListener("wybitna:deploy-static", handleDeploy);
    return () => {
      window.removeEventListener("wybitna:deploy-static", handleDeploy);
    };
  }, [projectId, runCommand]);

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

      {/* Pasek postępu statycznego deployu — pojawia się nad iframe po publikacji */}
      {deployStatus !== "idle" && (
        <div
          className={`pointer-events-none absolute bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-full border px-3 py-1 text-[11px] font-medium shadow-lg backdrop-blur ${
            deployStatus === "done"
              ? "border-emerald-500/40 bg-emerald-950/80 text-emerald-300"
              : deployStatus === "error"
                ? "border-red-500/40 bg-red-950/80 text-red-300"
                : "border-beige/20 bg-zinc-900/90 text-muted-foreground"
          }`}
        >
          {deployStatus === "building" && (
            <>
              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
              Buduję projekt…
            </>
          )}
          {deployStatus === "uploading" && (
            <>
              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
              Uploaduję do Storage…
            </>
          )}
          {deployStatus === "done" && "Opublikowano wersję statyczną"}
          {deployStatus === "error" && "Build nie powiódł się — Sandpack aktywny"}
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
