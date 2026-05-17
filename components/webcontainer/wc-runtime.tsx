"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { wcManager } from "./wc-manager";
import type { ProjectFiles } from "@/lib/types/project";
import { sanitizeProjectPackageJson } from "@/lib/sandpack/merge-preview-files";
import { getContentType } from "@/lib/static-deploy";

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

type DeployStatus =
  | "idle"
  | "building"
  | "preparing"
  | "uploading"
  | "uploading-large"
  | "finalizing"
  | "done"
  | "error";

type DeployProgress = { done: number; total: number };

/**
 * Limity pipeline'u uploadu bezpośrednio do Supabase Storage.
 * Vercel payload limit (4.5 MB) zostaje OMINIĘTY — pliki idą wprost z
 * przeglądarki do Storage przez pre-signed URLs, więc cap'em jest tylko
 * heap przeglądarki i bucket policy. 50 MB = bezpieczne ceiling dla
 * typowego buildu (full-stack landing page + obrazy lokalne).
 */
const MAX_MB = 50;
const WARN_MB = 35;

/** Liczba równoległych PUT-ów do Storage. Za duża wartość → throttling. */
const UPLOAD_CONCURRENCY = 5;

type SignedUpload = {
  path: string;
  signedUrl: string;
  token: string;
  contentType: string;
};

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
  const [deployProgress, setDeployProgress] = useState<DeployProgress>({
    done: 0,
    total: 0,
  });
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
        // Napraw package.json przed mounted do WC - stare projekty moga miec
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

    // Aktualizuj ref SYNCHRONICZNIE przed petla async - dziala jako "lock"
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
  // po udanej publikacji). Pipeline:
  //   1) `npm run build` w WebContainer
  //   2) `listDistFiles()` zwraca listę ścieżek
  //   3) POST /prepare → signed upload URLs dla każdej ścieżki
  //   4) Batchowany PUT bytes wprost z przeglądarki do Supabase Storage
  //   5) POST /finalize → weryfikacja index.html + ustaw static_deployed_at
  // Vercel payload limit (4.5 MB) jest OMINIĘTY — JSON przez API ma tylko
  // listę ścieżek, raw bytes lecą wprost do Storage signed URL.
  useEffect(() => {
    async function handleDeploy(e: Event) {
      const { projectId: targetId } = (
        e as CustomEvent<{ projectId: string }>
      ).detail;
      if (targetId !== projectId) return;
      if (!runCommand) return; // nie ma WebContainera, pomiń

      // === 1. Build ============================================
      setDeployStatus("building");
      setDeployProgress({ done: 0, total: 0 });
      const logs: string[] = [];

      const exitCode = await wcManager
        .runBuild((line) => logs.push(line))
        .catch(() => 1);

      if (exitCode !== 0) {
        console.warn("[deploy] npm run build failed. Logs:", logs.join("\n"));
        finishWithError("Build failed");
        return;
      }

      // === 2. Lista plików + pre-load bytes =====================
      setDeployStatus("preparing");
      const paths = await wcManager.listDistFiles().catch(() => [] as string[]);

      if (paths.length === 0) {
        console.warn("[deploy] No files in dist/. Build may have failed.");
        finishWithError(
          "Brak plików w katalogu wyjściowym — build mógł paść.",
        );
        return;
      }

      // Pre-load bytes do mapy w pamięci. Pozwala policzyć łączny rozmiar
      // (size guard) i przekazać surowe Uint8Array do PUT bez ponownego I/O
      // z WebContainera. Max ~50 MB w heapie — akceptowalne.
      const bytesMap = new Map<string, Uint8Array>();
      let totalBytes = 0;
      for (const p of paths) {
        const buf = await wcManager.readDistFileBytes(p);
        if (!buf) continue;
        bytesMap.set(p, buf);
        totalBytes += buf.byteLength;
      }

      const sizeMb = totalBytes / (1024 * 1024);
      if (sizeMb > MAX_MB) {
        console.warn(
          `[deploy] total size ${sizeMb.toFixed(2)}MB > ${MAX_MB}MB limit`,
        );
        finishWithError(
          `Strona jest za duża (${sizeMb.toFixed(1)}MB > ${MAX_MB}MB). Użyj narzędzia generateImage (Cloudinary CDN) zamiast wgrywać obrazy do /public/, lub osadź duże assety z zewnętrznego CDN.`,
          6000,
        );
        return;
      }
      const isLarge = sizeMb > WARN_MB;

      // === 3. POST /prepare → signed upload URLs ================
      const realPaths = Array.from(bytesMap.keys());
      let uploads: SignedUpload[] = [];
      try {
        const prepRes = await fetch(
          `/api/projects/${projectId}/deploy-static/prepare`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paths: realPaths }),
          },
        );
        if (!prepRes.ok) {
          const data = (await prepRes.json().catch(() => null)) as {
            error?: string;
          } | null;
          finishWithError(
            data?.error ?? `Prepare failed (HTTP ${prepRes.status}).`,
          );
          return;
        }
        const prepData = (await prepRes.json()) as { uploads?: SignedUpload[] };
        uploads = prepData.uploads ?? [];
      } catch (err) {
        console.warn("[deploy] prepare fetch failed", err);
        finishWithError("Nie udało się przygotować signed URL-i.");
        return;
      }

      if (uploads.length === 0) {
        finishWithError("Serwer nie zwrócił żadnego signed URL.");
        return;
      }

      // === 4. Batchowany PUT bytes do Storage ===================
      setDeployStatus(isLarge ? "uploading-large" : "uploading");
      setDeployProgress({ done: 0, total: uploads.length });

      const failed: Array<{ path: string; reason: string }> = [];
      let doneCounter = 0;

      // Worker-pool: stały rozmiar `UPLOAD_CONCURRENCY` workerów ciągnących
      // taski z FIFO queue. Pewniejsze niż chunked Promise.all bo gdy jeden
      // PUT jest wolny, inni nie czekają na koniec batcha.
      const queue: SignedUpload[] = [...uploads];
      async function worker() {
        while (queue.length > 0) {
          const item = queue.shift();
          if (!item) return;
          const bytes = bytesMap.get(item.path);
          if (!bytes) {
            failed.push({
              path: item.path,
              reason: "Brak bytes w pamięci klienta",
            });
            doneCounter++;
            setDeployProgress({ done: doneCounter, total: uploads.length });
            continue;
          }
          try {
            // Supabase signed upload URL akceptuje PUT z body=blob.
            // `x-upsert: true` pozwala nadpisać istniejący plik (orphan
            // cleanup w /prepare i tak czyści, ale to dodatkowy safety net
            // np. przy retry).
            const ct = item.contentType || getContentType(item.path);
            const blob = new Blob([new Uint8Array(bytes)], { type: ct });
            const putRes = await fetch(item.signedUrl, {
              method: "PUT",
              headers: {
                "Content-Type": ct,
                "x-upsert": "true",
                "cache-control": "max-age=300",
              },
              body: blob,
            });
            if (!putRes.ok) {
              const msg = await putRes.text().catch(() => "");
              failed.push({
                path: item.path,
                reason: `HTTP ${putRes.status} ${msg.slice(0, 120)}`,
              });
            }
          } catch (err) {
            failed.push({
              path: item.path,
              reason: err instanceof Error ? err.message : "fetch error",
            });
          } finally {
            doneCounter++;
            setDeployProgress({ done: doneCounter, total: uploads.length });
          }
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(UPLOAD_CONCURRENCY, uploads.length) }, () =>
          worker(),
        ),
      );

      if (failed.length > 0) {
        console.warn("[deploy] some uploads failed", failed);
        // Każdy zostawia choć trochę plików w Storage, ale nie ustawiamy
        // static_deployed_at - frontend strony domeny pokaże poprzednią
        // wersję (jeśli była) lub `siteNotPublished()` z proxy.ts.
        finishWithError(
          `Nie udało się wgrać ${failed.length}/${uploads.length} plików. Pierwszy błąd: ${failed[0].path} → ${failed[0].reason}`,
          6000,
        );
        return;
      }

      // === 5. POST /finalize ====================================
      setDeployStatus("finalizing");
      try {
        const finRes = await fetch(
          `/api/projects/${projectId}/deploy-static/finalize`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uploadedCount: uploads.length, errors: [] }),
          },
        );
        if (!finRes.ok) {
          const data = (await finRes.json().catch(() => null)) as {
            error?: string;
          } | null;
          finishWithError(data?.error ?? `Finalize failed (HTTP ${finRes.status}).`);
          return;
        }
      } catch (err) {
        console.warn("[deploy] finalize fetch failed", err);
        finishWithError("Nie udało się sfinalizować wdrożenia.");
        return;
      }

      // === 6. Sukces ============================================
      setDeployStatus("done");
      window.dispatchEvent(
        new CustomEvent("wybitna:static-deploy-done", {
          detail: { projectId, ok: true },
        }),
      );
      setTimeout(() => setDeployStatus("idle"), 5000);

      function finishWithError(message: string, hideAfterMs = 4000) {
        setDeployStatus("error");
        window.dispatchEvent(
          new CustomEvent("wybitna:static-deploy-done", {
            detail: { projectId, ok: false, error: message },
          }),
        );
        setTimeout(() => setDeployStatus("idle"), hideAfterMs);
      }
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

      {/* Pasek postępu statycznego deployu - pojawia się nad iframe po publikacji */}
      {deployStatus !== "idle" && (
        <div
          className={`pointer-events-none absolute bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-full border px-3 py-1 text-[11px] font-medium shadow-lg backdrop-blur ${
            deployStatus === "done"
              ? "border-emerald-500/40 bg-emerald-950/80 text-emerald-300"
              : deployStatus === "error"
                ? "border-red-500/40 bg-red-950/80 text-red-300"
                : deployStatus === "uploading-large"
                  ? "border-amber-500/40 bg-amber-950/80 text-amber-200"
                  : "border-beige/20 bg-zinc-900/90 text-muted-foreground"
          }`}
        >
          {deployStatus === "building" && (
            <>
              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
              Buduję projekt…
            </>
          )}
          {deployStatus === "preparing" && (
            <>
              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
              Przygotowuję upload (signed URLs)…
            </>
          )}
          {deployStatus === "uploading" && (
            <>
              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
              {deployProgress.total > 0
                ? `Wgrywanie plików bezpośrednio do magazynu: ${deployProgress.done} / ${deployProgress.total}`
                : "Uploaduję do Storage…"}
            </>
          )}
          {deployStatus === "uploading-large" && (
            <>
              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
              {deployProgress.total > 0
                ? `Duża strona — wgrywam: ${deployProgress.done} / ${deployProgress.total} plików…`
                : "Duża strona - uploaduję…"}
            </>
          )}
          {deployStatus === "finalizing" && (
            <>
              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
              Finalizuję wdrożenie…
            </>
          )}
          {deployStatus === "done" && "Opublikowano wersję statyczną"}
          {deployStatus === "error" && "Wdrożenie nie powiodło się — sprawdź konsolę"}
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
