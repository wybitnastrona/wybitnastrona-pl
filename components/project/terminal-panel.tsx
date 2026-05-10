"use client";

/**
 * Symulowany terminal projektu.
 *
 * MVP: symulowany shell (bez WebContainers) — reaguje na komendy AI
 * przekazywane przez kanał SSE `/api/projects/[id]/terminal-stream`
 * (do implementacji w przyszlosci) oraz na reczne wpisywanie przez uzytkownika.
 *
 * Podstawowe komendy sa obslugiwane lokalnie (help, clear, ls, echo).
 * Pozostale komendy wyswietlaja komunikat "niedostepne w trybie preview".
 *
 * Aby podpiac prawdziwe WebContainers nalezy zainstalowac @webcontainer/api
 * i zastapic `runCommand` ponizej wywolaniem webContainer.spawn().
 */

import { useEffect, useRef, useState } from "react";

type Line = {
  id: number;
  text: string;
  type: "input" | "output" | "error" | "info";
};

let lineId = 0;
function mkLine(text: string, type: Line["type"]): Line {
  return { id: lineId++, text, type };
}

const BANNER = [
  mkLine("wybitnastrona.pl — terminal projektu", "info"),
  mkLine('Wpisz "help" aby zobaczyc dostepne komendy.', "info"),
  mkLine("─".repeat(50), "info"),
];

const SIMULATED_FS: Record<string, string[]> = {
  "/": ["App.tsx", "index.tsx", "index.html", "components/"],
  "/components": [],
};

function simulate(cmd: string): string[] {
  const [bin, ...args] = cmd.trim().split(/\s+/);
  switch (bin) {
    case "help":
      return [
        "Dostepne komendy:",
        "  help          — ta pomoc",
        "  clear         — wyczysc terminal",
        "  ls [sciezka]  — lista plikow",
        "  echo <text>   — wyswietl tekst",
        "  pwd           — biezacy katalog",
        "  cat <plik>    — odczyt pliku (symulowany)",
        "",
        "Komendy takie jak npm, node, git nie sa dostepne w trybie podgladu.",
        "Aby uruchamiac prawdziwe komendy podlacz WebContainers (patrz docs/DEPLOYMENT.md).",
      ];
    case "clear":
      return ["__CLEAR__"];
    case "pwd":
      return ["/sandbox"];
    case "echo":
      return [args.join(" ")];
    case "ls": {
      const path = args[0] ?? "/";
      const entries = SIMULATED_FS[path] ?? SIMULATED_FS["/"];
      return entries.length ? entries : ["(pusty katalog)"];
    }
    case "cat":
      return [
        `Odczyt pliku "${args[0] ?? "?"}" nie jest dostepny w trybie podgladu.`,
        "Pliki projektu mozesz przeglądac w zakladce Kod.",
      ];
    case "npm":
    case "npx":
    case "node":
    case "git":
    case "pnpm":
    case "yarn":
      return [
        `Komenda "${bin}" nie jest dostepna w trybie podgladu Sandpack.`,
        'Aby uruchamiac komendy shell, zintegruj WebContainers (@webcontainer/api).',
      ];
    case "":
      return [];
    default:
      return [`Nieznana komenda: ${bin}. Wpisz "help" aby zobaczyc liste.`];
  }
}

export function TerminalPanel({ projectId }: { projectId: string }) {
  void projectId;
  const [lines, setLines] = useState<Line[]>(BANNER);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;

    setHistory((h) => [cmd, ...h].slice(0, 50));
    setHistoryIdx(-1);

    const inputLine = mkLine(`$ ${cmd}`, "input");
    const results = simulate(cmd);

    if (results[0] === "__CLEAR__") {
      setLines(BANNER);
    } else {
      const outputLines = results.map((t) => mkLine(t, "output"));
      setLines((prev) => [...prev, inputLine, ...outputLines]);
    }
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIdx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(nextIdx);
      setInput(history[nextIdx] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(nextIdx);
      setInput(nextIdx === -1 ? "" : (history[nextIdx] ?? ""));
    }
  }

  return (
    <div
      className="flex h-full flex-col bg-[#0a0a0a] font-mono text-[13px]"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Output area */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {lines.map((line) => (
          <div
            key={line.id}
            className={
              line.type === "input"
                ? "text-beige"
                : line.type === "error"
                  ? "text-red-400"
                  : line.type === "info"
                    ? "text-neutral-500"
                    : "text-neutral-300"
            }
          >
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-beige/10 px-3 py-2"
      >
        <span className="shrink-0 text-beige/70">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent text-beige outline-none placeholder:text-neutral-600"
          placeholder="wpisz komendę…"
        />
      </form>
    </div>
  );
}
