"use client";

import { useEffect, useRef } from "react";
import { wcManager } from "./wc-manager";

/**
 * Prawdziwy interaktywny terminal podpięty pod WebContainer.
 *
 * Używamy lazy import xterm żeby nie ladowac jego CSS/JS na SSR.
 */
export function WCTerminal() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | null = null;

    (async () => {
      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("xterm-addon-fit");
      // CSS xterm
      await import("xterm/css/xterm.css");

      if (cancelled || !containerRef.current) return;

      const term = new Terminal({
        convertEol: true,
        fontFamily: 'var(--font-geist-mono), "Fira Code", monospace',
        fontSize: 12,
        theme: {
          background: "#0a0a0a",
          foreground: "#e8dcc4",
          cursor: "#e8dcc4",
        },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      fit.fit();

      term.writeln("\x1b[33mwybitnastrona.pl — terminal WebContainer\x1b[0m");
      term.writeln("Wpisz dowolna komende shell (npm, node, git…)");
      term.writeln("");

      // Subskrybuj logi z WC
      const offLog = wcManager.on((ev) => {
        if (ev.type === "log") term.write(ev.line);
      });

      // Interaktywna powloka (jsh — domyslny shell WC)
      let writer: ((s: string) => void) | null = null;
      try {
        const proc = await wcManager.spawn("jsh", [], (chunk) =>
          term.write(chunk),
        );
        writer = proc.write;
        term.onData((data) => writer?.(data));
      } catch {
        term.writeln(
          "\r\n\x1b[31m[Nie udało się uruchomić shella. Czy WebContainer jest aktywny?]\x1b[0m",
        );
      }

      const onResize = () => {
        try {
          fit.fit();
        } catch {
          /* ignore */
        }
      };
      window.addEventListener("resize", onResize);

      dispose = () => {
        offLog();
        window.removeEventListener("resize", onResize);
        term.dispose();
      };
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden bg-[#0a0a0a]"
    />
  );
}
