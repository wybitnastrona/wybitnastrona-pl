"use client";

/**
 * Panel zarządzania formularzami i kontami admina dla wygenerowanej strony.
 *
 * Otwierany z DatabasePanel przez przycisk "Zarządzaj formularzami".
 *
 * Sekcje:
 *  1. Tabela zgłoszeń (Data Table) z kolumnami dynamicznymi po polach JSON.
 *  2. Przycisk Eksport do CSV (UTF-8 + BOM dla Excel/Sheets).
 *  3. Sekcja "Panel Administratora Strony" - tworzy konto admina
 *     w odpowiednim źródle (zewnętrzna baza Supabase lub współdzielona platformowa).
 */

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Inbox,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Project } from "@/lib/types/project";

type Submission = {
  id: string;
  fields: Record<string, unknown>;
  ip_address?: string | null;
  email_sent?: boolean | null;
  created_at: string;
};

type ApiResponse = {
  source: "shared" | "external";
  rows: Submission[];
  columns: string[];
  count?: number;
  message?: string;
  details?: string;
};

type Props = {
  project: Project;
  onBack: () => void;
};

function slugify(input: string): string {
  const lower = input.toLowerCase();
  const dashed = lower.replace(/[^a-z0-9]+/g, "-");
  const collapsed = dashed.replace(/-{2,}/g, "-");
  const trimmed = collapsed.replace(/^-+/, "").replace(/-+$/, "");
  return trimmed.slice(0, 40);
}

export function FormSubmissionsPanel({ project, onBack }: Props) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${project.id}/form-submissions`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as ApiResponse & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Błąd wczytywania zgłoszeń.");
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

  const rows = data?.rows ?? [];
  const dynamicColumns = data?.columns ?? [];
  const isExternal = data?.source === "external";

  const fileBaseName = useMemo(() => {
    const fromTitle = slugify(project.title ?? "projekt");
    const base = project.slug ?? (fromTitle || "projekt");
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `formularze_${base}_${yyyy}-${mm}-${dd}`;
  }, [project.slug, project.title]);

  function exportCsv() {
    if (rows.length === 0) return;
    const headers = ["created_at", ...dynamicColumns, "ip_address"];
    const lines = [headers.map(csvCell).join(",")];
    for (const r of rows) {
      const row = [
        formatDate(r.created_at),
        ...dynamicColumns.map((c) => stringify(r.fields?.[c])),
        r.ip_address ?? "",
      ];
      lines.push(row.map(csvCell).join(","));
    }
    // KRYTYCZNE: BOM \uFEFF na początku - bez tego Excel otwiera polskie znaki
    // niepoprawnie (mojibake). Z BOM Excel rozpoznaje UTF-8 prawidłowo.
    const csv = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBaseName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <header className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            aria-label="Wróć"
            className="text-foreground/70"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-medium text-foreground">
              Formularze i administratorzy
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Zgłoszenia z formularzy oraz konta admina dla panelu strony.
              {data ? (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-beige/15 bg-card/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Źródło: {isExternal ? "Twój Supabase" : "wybitnastrona.pl"}
                </span>
              ) : null}
            </p>
          </div>
        </header>

        <section className="rounded-xl border border-beige/15 bg-card/40">
          <div className="flex items-center justify-between gap-3 border-b border-beige/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-beige/80" />
              <h3 className="text-sm font-medium text-foreground">
                Zgłoszenia z formularza
              </h3>
              {data && (
                <span className="text-xs text-muted-foreground">
                  ({data.count ?? rows.length})
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
                aria-label="Odśwież"
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
                onClick={exportCsv}
                disabled={rows.length === 0 || loading}
                className="gap-1.5 bg-beige text-beige-foreground hover:bg-beige/90 disabled:opacity-50"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <Download className="h-3 w-3" />
                Eksportuj do CSV
              </Button>
            </div>
          </div>

          {error ? (
            <div className="px-4 py-10 text-center text-sm text-red-300">
              {error}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center px-4 py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wczytuję zgłoszenia...
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-foreground/80">
                Brak otrzymanych wiadomości.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Dodaj formularz kontaktowy na swojej stronie, aby zacząć
                zbierać zgłoszenia.
              </p>
              {data?.message && (
                <p className="mt-3 text-[11px] text-muted-foreground/80">
                  {data.message}
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  {dynamicColumns.map((c) => (
                    <TableHead key={c}>{c}</TableHead>
                  ))}
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                      {formatDate(r.created_at)}
                    </TableCell>
                    {dynamicColumns.map((c) => (
                      <TableCell
                        key={c}
                        className="max-w-[260px] break-words"
                      >
                        {stringify(r.fields?.[c])}
                      </TableCell>
                    ))}
                    <TableCell className="whitespace-nowrap font-mono text-[10px] text-muted-foreground/70">
                      {r.ip_address ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <AdminCreator project={project} isExternal={!!isExternal} />
      </div>
    </div>
  );
}

function AdminCreator({
  project,
  isExternal,
}: {
  project: Project;
  isExternal: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  async function submit() {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(
        `/api/projects/${project.id}/create-admin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        setResult({
          ok: false,
          text: json.error ?? "Nie udało się utworzyć konta admina.",
        });
      } else {
        setResult({
          ok: true,
          text: json.message ?? "Konto admina utworzone.",
        });
        setEmail("");
        setPassword("");
      }
    } catch (e) {
      setResult({
        ok: false,
        text: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-beige/15 bg-card/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-beige/80" />
        <h3 className="text-sm font-medium text-foreground">
          Panel administratora strony
        </h3>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Utwórz konto admina, które będzie mogło zalogować się do panelu
        zarządzania wygenerowaną stroną.
        {isExternal
          ? " Konto powstanie w Twoim Supabase (auth.users)."
          : " Konto zapisane w bazie wybitnastrona.pl (tabela project_admins)."}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email administratora">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@twojadomena.pl"
            autoComplete="off"
          />
        </Field>
        <Field label="Hasło (min. 8 znaków)">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="bezpieczne hasło"
            autoComplete="new-password"
          />
        </Field>
      </div>

      {result && (
        <p
          className={`mt-3 text-xs ${
            result.ok ? "text-emerald-300" : "text-red-300"
          }`}
        >
          {result.text}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={submitting || !email || password.length < 8}
          className="gap-1.5 bg-beige text-beige-foreground hover:bg-beige/90 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
          Utwórz konto admina
        </Button>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function stringify(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pl-PL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Owrap pojedyncza komórka CSV: zawsze w cudzysłowach, escape "" -> """".
 * Excel/Sheets oczekują takiego formatu (RFC 4180).
 */
function csvCell(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}
