"use client";

import { diffLines, type Change } from "diff";
import { useMemo } from "react";

type Props = {
  /** Stara zawartosc pliku (przed zmiana). */
  before: string;
  /** Nowa zawartosc (proponowana przez AI). */
  after: string;
  /** Sciezka pliku (do naglowka). */
  path?: string;
};

/**
 * Renderer side-by-side diff w stylu GitHub: linie usuniete (czerwone),
 * dodane (zielone), niezmienione (szare).
 */
export function DiffView({ before, after, path }: Props) {
  const changes = useMemo<Change[]>(
    () => diffLines(before, after),
    [before, after],
  );

  let oldLine = 0;
  let newLine = 0;
  const rows: Array<{
    type: "context" | "del" | "add";
    oldLine?: number;
    newLine?: number;
    text: string;
  }> = [];

  for (const part of changes) {
    const lines = part.value.split("\n");
    if (lines[lines.length - 1] === "") lines.pop();
    for (const line of lines) {
      if (part.added) {
        newLine++;
        rows.push({ type: "add", newLine, text: line });
      } else if (part.removed) {
        oldLine++;
        rows.push({ type: "del", oldLine, text: line });
      } else {
        oldLine++;
        newLine++;
        rows.push({ type: "context", oldLine, newLine, text: line });
      }
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-beige/10 bg-background/40">
      {path && (
        <div className="border-b border-beige/10 bg-card/40 px-3 py-2 font-mono text-xs text-muted-foreground">
          {path}
        </div>
      )}
      <div className="overflow-auto font-mono text-xs">
        <table className="w-full border-collapse">
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className={
                  r.type === "add"
                    ? "bg-emerald-500/10"
                    : r.type === "del"
                      ? "bg-rose-500/10"
                      : ""
                }
              >
                <td className="select-none border-r border-beige/5 px-2 py-0.5 text-right text-[10px] text-muted-foreground/60">
                  {r.oldLine ?? ""}
                </td>
                <td className="select-none border-r border-beige/5 px-2 py-0.5 text-right text-[10px] text-muted-foreground/60">
                  {r.newLine ?? ""}
                </td>
                <td className="px-2 py-0.5 align-top">
                  <span className="select-none pr-1 text-muted-foreground/50">
                    {r.type === "add" ? "+" : r.type === "del" ? "-" : " "}
                  </span>
                  <span
                    className={`whitespace-pre ${
                      r.type === "add"
                        ? "text-emerald-300"
                        : r.type === "del"
                          ? "text-rose-300 line-through opacity-80"
                          : "text-foreground/90"
                    }`}
                  >
                    {r.text}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
