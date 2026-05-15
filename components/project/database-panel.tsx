"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Plug,
  Plus,
  Save,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Project } from "@/lib/types/project";

type Props = {
  project: Project;
};

export function DatabasePanel({ project }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState(project.database_url ?? "");
  const [anonKey, setAnonKey] = useState(project.database_anon_key ?? "");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = Boolean(project.database_url);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/database`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url || null,
          anonKey: anonKey || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Nie udalo sie zapisac konfiguracji");
        return;
      }
      setSavedAt(new Date().toLocaleTimeString("pl-PL"));
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      await fetch(`/api/projects/${project.id}/database`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: null, anonKey: null }),
      });
      setUrl("");
      setAnonKey("");
      setSavedAt(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <header className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-beige/20 bg-beige/10 text-beige">
            <Database className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-medium text-foreground">
              Baza danych projektu
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Podepnij wlasny projekt Supabase do tej wygenerowanej strony.
              Asystent AI bedzie wiedzial o jego istnieniu i bedzie generowac
              kod uzywajacy tych poswiadczen.
            </p>
          </div>
        </header>

        <WybitnaBazaDanychSection project={project} />

        {/* Placeholder CTA — "Połącz z własnym Supabase" */}
        <section className="rounded-xl border border-beige/20 bg-beige/5 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-beige/10 text-beige">
              <Plug className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Połącz z własnym Supabase
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Szybkie połączenie przez OAuth — bez kopiowania kluczy.
                Dostępne wkrótce.
              </p>
            </div>
            <button
              type="button"
              disabled
              title="Wkrótce dostępne"
              className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-beige/20 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground opacity-60"
            >
              <ExternalLink className="h-3 w-3" />
              Połącz (wkrótce)
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-beige/15 bg-card/40 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Konfiguracja Supabase
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Skopiuj URL i anon key z{" "}
                <a
                  href="https://supabase.com/dashboard/project/_/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-beige/90 hover:text-beige"
                >
                  Project Settings -&gt; API
                </a>
                .
              </p>
            </div>
            {isConfigured && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                Skonfigurowano
              </span>
            )}
          </div>

          <div className="mt-4 space-y-3">
            <Field label="URL projektu Supabase">
              <Input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://xxxxxxxxxxxx.supabase.co"
                className="font-mono text-xs"
              />
            </Field>

            <Field label="Anon (publiczny) klucz API">
              <div className="flex items-center gap-2">
                <Input
                  type={showKey ? "text" : "password"}
                  value={anonKey}
                  onChange={(event) => setAnonKey(event.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={() => setShowKey((value) => !value)}
                  aria-label={showKey ? "Ukryj klucz" : "Pokaz klucz"}
                >
                  {showKey ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </Field>
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-300">{error}</p>
          )}
          {savedAt && !error && (
            <p className="mt-3 text-xs text-emerald-300">
              Zapisano o {savedAt}.
            </p>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            {isConfigured && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleClear}
                disabled={saving}
                className="text-red-300 hover:bg-red-500/10"
              >
                Odlacz
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-beige text-beige-foreground hover:bg-beige/90"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Zapisz konfiguracje
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-beige/15 bg-card/40 p-5">
          <p className="text-sm font-medium text-foreground">
            Co zalozyc w Supabase
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Lista najczestszych zasobow potrzebnych w aplikacji generowanej
            na wybitnastrona.pl. Asystent dopisze SQL i kod kliencki, gdy go o to
            poprosisz.
          </p>
          <ul className="mt-3 space-y-2 text-xs text-foreground/85">
            <Row text="Tabela uzytkownikow (auth.users juz istnieje w Supabase) - rozszerz o profile w public.profiles." />
            <Row text="Row Level Security (RLS) wlaczone dla kazdej tabeli + polityki sprawdzajace auth.uid()." />
            <Row text="Storage bucket na uploady (np. zdjecia produktow) - private + signed URLs." />
            <Row text="pgvector (extension) - jezeli chcesz dodac wyszukiwanie semantyczne." />
            <Row text="Edge Function lub Database Webhook - dla maili transakcyjnych." />
          </ul>
          <a
            href="https://supabase.com/docs/guides/database/tables"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-7 items-center gap-1 text-xs text-beige/90 transition hover:text-beige"
          >
            <ExternalLink className="h-3 w-3" />
            Dokumentacja Supabase
          </a>
        </section>

        <section className="rounded-xl border border-dashed border-beige/20 bg-card/40 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-beige/20 bg-beige/10 text-beige">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                Wkrotce: kreator schematu
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pracujemy nad widokiem, w ktorym przeklikasz tabele, kolumny i
                polityki RLS. Asystent przeniesie to do migracji SQL i kodu
                klienta.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
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
    <div>
      <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function Row({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-beige/80" />
      <span>{text}</span>
    </li>
  );
}

/**
 * Wybitna Baza Danych — auto-provisioned Supabase per project.
 *
 * Status lifecycle: none → provisioning → ready (or error).
 * Polls every 5s while in "provisioning" to refresh server-side data.
 */
function WybitnaBazaDanychSection({ project }: { project: Project }) {
  const router = useRouter();
  const status = project.app_supabase_status ?? "none";
  const url = project.app_supabase_url ?? null;
  const ref = project.app_supabase_project_id ?? null;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh while provisioning.
  useEffect(() => {
    if (status !== "provisioning") return;
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [status, router]);

  async function handleProvision() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/projects/${project.id}/provision-database`,
        { method: "POST" },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.message ?? data.error ?? "Nie udało się utworzyć bazy.");
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd sieci.");
    } finally {
      setBusy(false);
    }
  }

  const statusBadge =
    status === "ready" ? (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">
        <CheckCircle2 className="h-3 w-3" />
        Gotowa
      </span>
    ) : status === "provisioning" ? (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">
        <Loader2 className="h-3 w-3 animate-spin" />
        Tworzę
      </span>
    ) : status === "error" ? (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-red-300">
        <AlertCircle className="h-3 w-3" />
        Błąd
      </span>
    ) : null;

  return (
    <section className="rounded-xl border border-beige/25 bg-gradient-to-br from-beige/10 to-beige/0 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-beige/15 text-beige">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Wybitna Baza Danych
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Dedykowana baza PostgreSQL dla tego projektu — utworzymy ją
              automatycznie. Tabele <code>categories</code>, <code>products</code>,{" "}
              <code>cart_items</code> z RLS i indeksami będą gotowe od ręki.
            </p>
          </div>
        </div>
        {statusBadge}
      </div>

      {status === "ready" && url && (
        <div className="mt-4 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">URL:</span>
            <code className="truncate font-mono text-foreground/90">{url}</code>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={`https://supabase.com/dashboard/project/${ref}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-beige/25 bg-card/60 px-3 text-xs text-foreground transition hover:border-beige/45 hover:text-beige"
            >
              <ExternalLink className="h-3 w-3" />
              Otwórz w Supabase
            </a>
            <a
              href={`https://supabase.com/dashboard/project/${ref}/editor`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-beige/15 bg-card/40 px-3 text-xs text-muted-foreground transition hover:border-beige/30 hover:text-foreground"
            >
              <Database className="h-3 w-3" />
              Tabele
            </a>
          </div>
        </div>
      )}

      {status === "provisioning" && (
        <p className="mt-3 text-xs text-amber-200/90">
          Tworzę nową bazę PostgreSQL — to potrwa 60-120 sekund. Status
          odświeży się automatycznie.
        </p>
      )}

      {error && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-red-300">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}

      {(status === "none" || status === "error") && (
        <div className="mt-4 flex items-center justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleProvision}
            disabled={busy}
            className="bg-beige text-beige-foreground hover:bg-beige/90"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {status === "error" ? "Spróbuj ponownie" : "Utwórz Wybitną Bazę Danych"}
          </Button>
        </div>
      )}
    </section>
  );
}
