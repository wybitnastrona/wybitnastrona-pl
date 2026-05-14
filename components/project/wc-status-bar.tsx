"use client";

import { useEffect, useState } from "react";
import { Activity, Circle, FileCode, Server } from "lucide-react";
import { wcManager } from "@/components/webcontainer/wc-manager";

type Phase = "idle" | "boot" | "install" | "starting" | "ready";

type Props = {
  /** Sciezka aktywnego pliku w edytorze (do prawej kolumny). */
  activePath?: string | null;
};

/**
 * Cienki dolny pasek statusu WebContainera (Bolt-style).
 * Subskrybuje wcManager i pokazuje:
 *   - lewa: faza ("Inicjalizacja" / "npm install" / "Uruchamiam dev server" / "Serwer aktywny")
 *   - srodek: port (gdy aktywny)
 *   - prawa: nazwa pliku w edytorze
 */
export function WcStatusBar({ activePath: activePathProp }: Props) {
  // Lazy init z obecnego stanu wcManagera — pozwala uniknac setState w useEffect.
  const [phase, setPhase] = useState<Phase>(() =>
    wcManager.getServerUrl() ? "ready" : "idle",
  );
  const [port, setPort] = useState<number | null>(() => {
    const url = wcManager.getServerUrl();
    if (!url) return null;
    try {
      const u = new URL(url);
      const p = Number(u.port || (u.protocol === "https:" ? 443 : 80));
      return Number.isNaN(p) ? null : p;
    } catch {
      return null;
    }
  });
  const [activePathState, setActivePathState] = useState<string | null>(
    activePathProp ?? null,
  );
  const activePath = activePathProp ?? activePathState;

  // Subskrybuj globalny event 'wybitna:active-file' (emitowany przez
  // WorkspaceCodeEditor) jezeli prop nie zostal podany. Pozwala uzywac
  // <WcStatusBar /> bez prop drillingu.
  useEffect(() => {
    if (activePathProp !== undefined) return;
    function handleActive(e: Event) {
      const detail = (e as CustomEvent<{ path: string | null }>).detail;
      setActivePathState(detail?.path ?? null);
    }
    window.addEventListener("wybitna:active-file", handleActive);
    return () =>
      window.removeEventListener("wybitna:active-file", handleActive);
  }, [activePathProp]);

  useEffect(() => {
    const off = wcManager.on((event) => {
      if (event.type === "boot") {
        setPhase(event.status === "starting" ? "boot" : "starting");
      } else if (event.type === "install") {
        if (event.status === "running") setPhase("install");
        else if (event.status === "done") setPhase("starting");
        else if (event.status === "error") setPhase("idle");
      } else if (event.type === "server") {
        setPhase("ready");
        setPort(event.port);
      }
    });
    return off;
  }, []);

  const { label, dotClass } = describe(phase);
  const fileLabel = activePath ?? "—";

  return (
    <div className="flex h-6 shrink-0 items-center justify-between gap-3 border-t border-beige/10 bg-card/40 px-3 text-[10px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Circle className={"h-2 w-2 fill-current " + dotClass} />
        <Server className="h-3 w-3" />
        <span>{label}</span>
      </span>

      <span className="inline-flex items-center gap-1.5">
        {port !== null && (
          <>
            <Activity className="h-3 w-3" />
            <span className="font-mono">port {port}</span>
          </>
        )}
      </span>

      <span className="inline-flex min-w-0 items-center gap-1.5">
        <FileCode className="h-3 w-3 shrink-0" />
        <span className="truncate font-mono">{fileLabel}</span>
      </span>
    </div>
  );
}

function describe(phase: Phase): { label: string; dotClass: string } {
  switch (phase) {
    case "boot":
      return { label: "Inicjalizacja WebContainera…", dotClass: "text-amber-300" };
    case "install":
      return { label: "Instaluje zaleznosci (npm install)…", dotClass: "text-amber-300" };
    case "starting":
      return { label: "Uruchamiam dev server…", dotClass: "text-amber-300" };
    case "ready":
      return { label: "Serwer aktywny", dotClass: "text-emerald-400" };
    case "idle":
    default:
      return { label: "Oczekiwanie", dotClass: "text-zinc-500" };
  }
}
