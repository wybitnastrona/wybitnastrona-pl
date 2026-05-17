"use client";

/**
 * Panel "Audyt Bezpieczeństwa" - skanuje polityki RLS w bazie projektu i
 * wyświetla ostrzeżenia "RLS Policy Always True" dla niebezpiecznych konfiguracji.
 *
 * Wywołuje GET /api/projects/[id]/security-audit która używa SQL RPC
 * `get_rls_audit()` (migracja 0046) do pobrania danych.
 *
 * Przycisk "Poproś Wybitnego programistę o naprawę" wysyła do chatu projektu
 * przygotowany komunikat z lista wadliwych polityk - przez globalny CustomEvent
 * `wybitna:send-chat-message`.
 */

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/types/project";

type AuditRow = {
  tablename: string;
  policyname: string;
  cmd: string;
  roles: string[];
  qual: string | null;
  with_check: string | null;
  is_unsafe: boolean;
  reason: string;
};

type AuditResponse = {
  source: "external" | "shared";
  rows: AuditRow[];
  unsafeCount: number;
  message?: string;
  installSql?: string;
};

export function SecurityAuditPanel({ project }: { project: Project }) {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${project.id}/security-audit`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as AuditResponse & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Błąd audytu.");
      } else {
        setData(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const unsafe = useMemo(
    () => (data?.rows ?? []).filter((r) => r.is_unsafe),
    [data],
  );

  function askFix() {
    if (unsafe.length === 0) return;
    const list = unsafe
      .map(
        (r) =>
          `- ${r.tablename} (${r.cmd}, polityka "${r.policyname}", role ${r.roles.join("/")}): ${r.reason}`,
      )
      .join("\n");

    const message =
      `Wykryto luki RLS w bazie projektu. Napraw je przez wygenerowanie ` +
      `bezpiecznych polityk dla nastepujacych tabel:\n\n${list}\n\n` +
      `Wymagania:\n` +
      `- Zastap klauzule USING / WITH CHECK ustawione na 'true' wlasciwymi predykatami ` +
      `(np. project_id = current_project_id() lub user_id = auth.uid()).\n` +
      `- Dla operacji INSERT/UPDATE/DELETE nie pozwol rolom anon/authenticated ` +
      `na nieograniczony zapis.\n` +
      `- Po naprawie pokaz krotkie podsumowanie SQL ktore zostalo zaaplikowane.`;

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("wybitna:send-chat-message", {
          detail: { text: message },
        }),
      );
    }
  }

  async function copySql() {
    if (!data?.installSql) return;
    try {
      await navigator.clipboard.writeText(data.installSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }

  return (
    <section className="rounded-xl border border-beige/15 bg-card/40">
      <div className="flex items-center justify-between gap-3 border-b border-beige/10 px-4 py-3">
        <div className="flex items-center gap-2">
          {unsafe.length > 0 ? (
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          )}
          <h3 className="text-sm font-medium text-foreground">
            Audyt Bezpieczeństwa
          </h3>
          {data && (
            <span
              className={`text-xs ${
                unsafe.length > 0 ? "text-amber-300" : "text-emerald-300"
              }`}
            >
              {unsafe.length > 0
                ? `${unsafe.length} ostrzeżeń`
                : "wszystko OK"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Odśwież audyt"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={askFix}
            disabled={unsafe.length === 0 || loading}
            className="gap-1.5 bg-beige text-beige-foreground hover:bg-beige/90 disabled:opacity-50"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Poproś Wybitnego programistę o naprawę
          </Button>
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Identyfikuje luki w zabezpieczeniach, takie jak brakujące polityki
          RLS i niebezpieczne uprawnienia. Użyj przycisku
          {" "}<strong>Poproś Wybitnego programistę o naprawę</strong>{" "}
          aby wdrożyć zalecane ulepszenia.
        </p>
      </div>

      {error ? (
        <div className="px-4 py-6 text-center text-sm text-red-300">
          {error}
        </div>
      ) : loading && !data ? (
        <div className="flex items-center justify-center px-4 py-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Skanuję polityki RLS...
        </div>
      ) : data?.message ? (
        <div className="space-y-3 px-4 pb-4">
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {data.message}
          </p>
          {data.installSql && (
            <div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowSql((v) => !v)}
                  className="text-[11px] text-beige/80 hover:text-beige"
                >
                  {showSql ? "Ukryj skrypt SQL" : "Pokaż skrypt SQL"}
                </button>
                {showSql && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void copySql()}
                    className="h-7 gap-1.5 text-[11px]"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {copied ? "Skopiowano" : "Kopiuj"}
                  </Button>
                )}
              </div>
              {showSql && (
                <pre className="mt-2 max-h-72 overflow-auto rounded-md border border-beige/10 bg-background/60 p-3 font-mono text-[10px] leading-relaxed text-foreground/80">
                  {data.installSql}
                </pre>
              )}
            </div>
          )}
        </div>
      ) : unsafe.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-emerald-400/70" />
          <p className="mt-3 text-sm text-foreground/80">
            Brak wykrytych luk w politykach RLS.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Wszystkie polityki mają poprawnie zawężone klauzule USING /
            WITH CHECK.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-beige/10">
          {unsafe.map((r, idx) => (
            <li
              key={`${r.tablename}-${r.policyname}-${idx}`}
              className="flex items-start gap-3 px-4 py-3"
            >
              <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-300">
                <AlertTriangle className="h-3 w-3" />
                Warning
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  RLS Policy Always True -{" "}
                  <span className="font-mono text-xs text-amber-200">
                    public.{r.tablename}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Operacja <span className="font-mono">{r.cmd}</span>, role{" "}
                  <span className="font-mono">
                    {r.roles.length > 0 ? r.roles.join(", ") : "—"}
                  </span>
                  , polityka{" "}
                  <span className="font-mono">&quot;{r.policyname}&quot;</span>
                </p>
                <p className="mt-1 text-xs text-amber-200/80">{r.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
