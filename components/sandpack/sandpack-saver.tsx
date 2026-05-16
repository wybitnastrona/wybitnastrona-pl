"use client";

/**
 * SandpackSaver – komponent montowany wewnatrz SandpackProvider.
 *
 * Nasluchuje zmian plikow w edytorze (useSandpack hook), debounce 1.5s,
 * a nastepnie wysyla PATCH /api/projects/[id]/files z aktualna zawartoscia.
 *
 * Nie renderuje zadnego UI.
 */

import { useEffect, useRef } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";

type Props = {
  projectId: string;
  /** Callback informujacy rodzica o stanie zapisu. */
  onSaveStatus?: (status: "idle" | "saving" | "saved" | "error") => void;
};

const DEBOUNCE_MS = 1500;

export function SandpackSaver({ projectId, onSaveStatus }: Props) {
  const { sandpack } = useSandpack();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Przechowuj hash poprzedniego stanu, zeby nie zapisywac bez zmian.
  const prevHashRef = useRef<string>("");
  /** Dopoki bundler nie jest "running", updateFile wywoluje dispatch w idle - kolejkujemy delty z chatu. */
  const pendingPartialRef = useRef<Map<string, string>>(new Map());

  // Faza 1.3: nasluchuj eventow `wybitna:partial-write` z chat-panela
  // i pokazuj typewriter effect - kazdy delta nadpisuje plik w Sandpacku.
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ path: string; content: string }>;
      const { path, content } = ce.detail ?? {};
      if (!path) return;
      const norm = path.startsWith("/") ? path : `/${path}`;

      if (sandpack.status !== "running") {
        pendingPartialRef.current.set(norm, content);
        return;
      }

      try {
        sandpack.updateFile(norm, content, false);
        sandpack.openFile(norm);
      } catch {
        try {
          sandpack.addFile({ [norm]: { code: content } });
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("wybitna:partial-write", handler as EventListener);
    return () =>
      window.removeEventListener("wybitna:partial-write", handler as EventListener);
  }, [sandpack]);

  // Opróznij kolejkę strumienia, gdy bundler wstanie (np. po pierwszym mount / split layout).
  useEffect(() => {
    if (sandpack.status !== "running") return;
    const pending = pendingPartialRef.current;
    if (pending.size === 0) return;
    const entries = [...pending.entries()];
    pending.clear();
    for (const [norm, content] of entries) {
      try {
        sandpack.updateFile(norm, content, false);
        sandpack.openFile(norm);
      } catch {
        try {
          sandpack.addFile({ [norm]: { code: content } });
        } catch {
          /* ignore */
        }
      }
    }
  }, [sandpack, sandpack.status]);

  useEffect(() => {
    const files = sandpack.files;
    // Prosty hash: JSON.stringify kluczy+kodu.
    const hash = JSON.stringify(
      Object.fromEntries(
        Object.entries(files)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, typeof v === "object" && "code" in v ? v.code : v]),
      ),
    );

    if (hash === prevHashRef.current) return;
    prevHashRef.current = hash;

    // Anuluj poprzednie odliczanie.
    if (timerRef.current) clearTimeout(timerRef.current);

    onSaveStatus?.("idle");

    timerRef.current = setTimeout(async () => {
      onSaveStatus?.("saving");
      try {
        // Zbuduj ProjectFiles (tylko aktywne pliki, bez ukrytych metadanych Sandpacka)
        const payload: Record<string, { code: string }> = {};
        for (const [path, file] of Object.entries(files)) {
          if (typeof file === "object" && "code" in file) {
            payload[path] = { code: file.code as string };
          }
        }

        const res = await fetch(`/api/projects/${projectId}/files`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: payload }),
        });

        onSaveStatus?.(res.ok ? "saved" : "error");

        // Ukryj "Zapisano" po 2s.
        if (res.ok) {
          setTimeout(() => onSaveStatus?.("idle"), 2000);
        }
      } catch {
        onSaveStatus?.("error");
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandpack.files, projectId]);

  return null;
}
