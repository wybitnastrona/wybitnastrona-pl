"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Plug,
  Plus,
  Save,
  Sparkles,
  Wand2,
  X,
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

        <SupabaseOAuthConnectSection project={project} />

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

        <GenerateSqlSection project={project} />
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


/**
 * Wybitna Baza Danych — shared Supabase instance, per-project opt-in.
 *
 * One Supabase project hosts tables for ALL generated apps. Each app is
 * isolated by a `project_id` column + RLS policies that read the
 * `x-project-id` request header injected by the Supabase JS client.
 *
 * Activating sets app_db_enabled=true so the AI starts injecting the
 * shared DB credentials into generated code.
 */
function WybitnaBazaDanychSection({ project }: { project: Project }) {
  const router = useRouter();
  const enabled = project.app_db_enabled ?? false;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleActivate() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/projects/${project.id}/activate-database`,
        { method: "POST" },
      );
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.message ?? data.error ?? "Nie udało się aktywować bazy.");
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd sieci.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate() {
    setBusy(true);
    try {
      await fetch(`/api/projects/${project.id}/activate-database`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

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
              Wspólna baza PostgreSQL dla wszystkich projektów — tabele{" "}
              <code>categories</code>, <code>products</code>, <code>cart_items</code>.
              Twoje dane są odizolowane przez kolumnę <code>project_id</code> i
              polityki RLS — żaden inny projekt nie widzi Twoich rekordów.
            </p>
          </div>
        </div>
        {enabled ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Aktywna
          </span>
        ) : null}
      </div>

      {enabled && (
        <div className="mt-4 space-y-3 text-xs">
          <p className="text-muted-foreground">
            Asystent AI wie o tej bazie i automatycznie generuje kod Supabase
            używający nagłówka <code className="text-foreground/80">x-project-id: {project.id}</code>{" "}
            do izolacji danych.
          </p>
          <div className="flex items-center gap-2">
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-beige/25 bg-card/60 px-3 text-xs text-foreground transition hover:border-beige/45 hover:text-beige"
            >
              <ExternalLink className="h-3 w-3" />
              Panel Supabase
            </a>
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={busy}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-500/20 bg-card/40 px-3 text-xs text-red-300/70 transition hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
            >
              Odłącz
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-red-300">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}

      {!enabled && (
        <div className="mt-4 flex items-center justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleActivate}
            disabled={busy}
            className="bg-beige text-beige-foreground hover:bg-beige/90"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Aktywuj Wybitną Bazę Danych
          </Button>
        </div>
      )}
    </section>
  );
}

/**
 * "Połącz z własnym Supabase" — Personal Access Token (PAT) flow.
 *
 * 1. Użytkownik generuje PAT na supabase.com/dashboard/account/tokens
 * 2. Wkleja token w pole — kliknięcie "Pobierz projekty" odpytuje Management API
 * 3. Modal pokazuje listę projektów użytkownika → wybiera → backend pobiera anon key
 *    → zapisuje database_url + database_anon_key w projects row
 *
 * PAT NIE jest persystowany — używany jednorazowo w trakcie flow.
 */
function SupabaseOAuthConnectSection({ project }: { project: Project }) {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [pat, setPat] = useState("");
  const [fetching, setFetching] = useState(false);
  const [patError, setPatError] = useState<string | null>(null);

  // Dane pobrane PAT-em — przekazywane do modala
  const [fetchedData, setFetchedData] = useState<{
    projects: SupabaseProjectRow[];
    organizations: SupabaseOrgRow[];
  } | null>(null);

  const alreadyAttached = Boolean(project.database_url);

  async function handleFetchProjects() {
    if (!pat.trim()) {
      setPatError("Wklej Personal Access Token.");
      return;
    }
    setPatError(null);
    setFetching(true);
    try {
      const res = await fetch(
        `/api/integrations/supabase/projects?token=${encodeURIComponent(pat.trim())}`,
      );
      const data = (await res.json()) as {
        projects?: SupabaseProjectRow[];
        organizations?: SupabaseOrgRow[];
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setPatError(data.message ?? data.error ?? "Nie udało się pobrać projektów.");
        return;
      }
      setFetchedData({
        projects: data.projects ?? [],
        organizations: data.organizations ?? [],
      });
      setShowPicker(true);
    } catch (err) {
      setPatError(err instanceof Error ? err.message : "Błąd sieci.");
    } finally {
      setFetching(false);
    }
  }

  return (
    <section className="rounded-xl border border-beige/20 bg-beige/5 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-beige/10 text-beige">
          <Plug className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              Połącz z własnym Supabase
            </p>
            {alreadyAttached && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                Podpięty
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Wklej Personal Access Token z{" "}
            <a
              href="https://supabase.com/dashboard/account/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-beige/90 hover:text-beige"
            >
              supabase.com/dashboard/account/tokens
            </a>
            {" "}— wybierzesz projekt z listy. Token nie jest zapisywany.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <Input
              type="password"
              placeholder="sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFetchProjects()}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleFetchProjects}
              disabled={fetching || !pat.trim()}
              className="shrink-0 bg-beige text-beige-foreground hover:bg-beige/90"
            >
              {fetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              Pobierz projekty
            </Button>
          </div>

          {patError && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-red-300">
              <AlertCircle className="h-3 w-3" />
              {patError}
            </p>
          )}
        </div>
      </div>

      {showPicker && fetchedData && (
        <SupabaseProjectPickerModal
          projectId={project.id}
          pat={pat}
          initialProjects={fetchedData.projects}
          initialOrgs={fetchedData.organizations}
          onClose={() => setShowPicker(false)}
          onPicked={() => {
            setShowPicker(false);
            setPat("");
            router.refresh();
          }}
        />
      )}
    </section>
  );
}

type SupabaseProjectRow = {
  id: string;
  ref?: string;
  name: string;
  organization_id: string;
  region?: string;
  status?: string;
};
type SupabaseOrgRow = { id: string; name: string };

function SupabaseProjectPickerModal({
  projectId,
  pat,
  initialProjects,
  initialOrgs,
  onClose,
  onPicked,
}: {
  projectId: string;
  pat: string;
  initialProjects: SupabaseProjectRow[];
  initialOrgs: SupabaseOrgRow[];
  onClose: () => void;
  onPicked: () => void;
}) {
  const [projects] = useState<SupabaseProjectRow[]>(initialProjects);
  const [orgs] = useState<SupabaseOrgRow[]>(initialOrgs);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [newName, setNewName] = useState("");
  const [newOrg, setNewOrg] = useState<string>(initialOrgs[0]?.id ?? "");

  async function attachExisting(ref: string) {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/supabase/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, token: pat, action: "attach", ref }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.message ?? data.error ?? "Nie udało się podpiąć.");
        return;
      }
      onPicked();
    } finally {
      setWorking(false);
    }
  }

  async function createNew() {
    if (!newName || !newOrg) {
      setError("Nazwa projektu i organizacja są wymagane.");
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/supabase/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          token: pat,
          action: "create",
          name: newName,
          orgId: newOrg,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.message ?? data.error ?? "Nie udało się utworzyć projektu.");
        return;
      }
      onPicked();
    } finally {
      setWorking(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10000] overflow-y-auto bg-black/60 backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-lg rounded-3xl border border-beige/15 bg-card p-6 shadow-[0_20px_70px_rgba(0,0,0,0.4)]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-beige/15 bg-background/50 text-muted-foreground transition hover:border-beige/40 hover:text-foreground"
            aria-label="Zamknij"
          >
            <X className="h-4 w-4" />
          </button>

          <h3 className="text-lg font-medium text-foreground">
            Wybierz projekt Supabase
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Podepnij istniejący projekt lub utwórz nowy. URL i anon key zapiszemy
            automatycznie w tym projekcie wybitnastrona.
          </p>

          {error && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-red-300">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}

          <>
              <div className="mt-5">
                <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Twoje projekty ({projects.length})
                </p>
                {projects.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Brak projektów — utwórz nowy poniżej.
                  </p>
                ) : (
                  <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                    {projects.map((p) => {
                      const ref = p.ref ?? p.id;
                      return (
                        <li key={ref}>
                          <button
                            type="button"
                            disabled={working}
                            onClick={() => attachExisting(ref)}
                            className="flex w-full items-center justify-between gap-3 rounded-lg border border-beige/15 bg-card/40 px-3 py-2 text-left text-xs transition hover:border-beige/40 hover:bg-beige/5 disabled:opacity-50"
                          >
                            <div>
                              <p className="font-medium text-foreground">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {ref} {p.region ? `· ${p.region}` : ""}
                              </p>
                            </div>
                            <Plug className="h-3.5 w-3.5 text-beige/70" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="mt-5 border-t border-beige/10 pt-4">
                <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Utwórz nowy projekt
                </p>
                <div className="space-y-2">
                  <Input
                    placeholder="Nazwa projektu (np. moja-strona)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="text-xs"
                  />
                  {orgs.length > 0 && (
                    <select
                      value={newOrg}
                      onChange={(e) => setNewOrg(e.target.value)}
                      className="w-full rounded-lg border border-beige/20 bg-background px-3 py-2 text-xs text-foreground"
                    >
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={createNew}
                    disabled={working || !newName || !newOrg}
                    className="w-full bg-beige text-beige-foreground hover:bg-beige/90"
                  >
                    {working ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Utwórz i podepnij (60-120s)
                  </Button>
                </div>
              </div>
            </>
        </div>
      </div>
    </div>
  );
}

/**
 * "Generuj SQL dla projektu" — AI analizuje kod aplikacji i proponuje SQL
 * (CREATE TABLE + RLS + indeksy) dopasowany do tej konkretnej apki.
 *
 * Zastępuje statyczną listę "Co założyć w Supabase" + sekcję "Wkrótce: kreator".
 */
function GenerateSqlSection({ project }: { project: Project }) {
  const [busy, setBusy] = useState(false);
  const [sql, setSql] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/generate-sql`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        sql?: string;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.sql) {
        setError(data.message ?? data.error ?? "Nie udało się wygenerować SQL.");
        return;
      }
      setSql(data.sql);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!sql) return;
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-xl border border-beige/15 bg-card/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-beige/20 bg-beige/10 text-beige">
            <Wand2 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Generuj SQL dla projektu
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              AI przeanalizuje kod tej aplikacji i przygotuje minimalny skrypt
              SQL (CREATE TABLE, RLS, indeksy) gotowy do wklejenia w SQL Editor.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleGenerate}
          disabled={busy}
          className="bg-beige text-beige-foreground hover:bg-beige/90"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {busy ? "Generuję..." : "Generuj SQL"}
        </Button>
      </div>

      {error && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-red-300">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}

      {sql && (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2 rounded-t-lg border border-b-0 border-beige/15 bg-background/40 px-3 py-1.5">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Gotowy do wklejenia w Supabase SQL Editor
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-md border border-beige/20 bg-card/60 px-2 py-1 text-[11px] text-foreground transition hover:border-beige/40 hover:bg-beige/10"
            >
              {copied ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? "Skopiowano" : "Kopiuj"}
            </button>
          </div>
          <pre className="max-h-96 overflow-y-auto rounded-b-lg border border-beige/15 bg-background/60 p-3 text-[11px] leading-relaxed font-mono text-foreground/90">
            <code>{sql}</code>
          </pre>
          <a
            href="https://supabase.com/dashboard/project/_/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex h-7 items-center gap-1 text-[11px] text-beige/90 transition hover:text-beige"
          >
            <ExternalLink className="h-3 w-3" />
            Otwórz SQL Editor w Supabase
          </a>
        </div>
      )}
    </section>
  );
}
