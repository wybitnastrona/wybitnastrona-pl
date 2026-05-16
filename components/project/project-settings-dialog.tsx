"use client";

/**
 * Wybitna-style "Ustawienia projektu" - modal w stylu Bolt.new:
 * lewa nawigacja + prawa zawartosc. Skupia w jednym miejscu wszystkie
 * konfigurację per-projekt: Ogolne, Domeny, Analytics, Database, Auth, Stripe,
 * File Storage, Backups.
 *
 * Trigger: <ProjectTopbar> ma przycisk z ikonka Settings.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Cloud,
  CreditCard,
  Database,
  FolderOpen,
  Globe,
  History,
  Lock,
  Save,
  Server,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Project } from "@/lib/types/project";
import { AnalyticsDashboard } from "@/components/project/analytics-dashboard";
import { DatabasePanel } from "@/components/project/database-panel";
import { StripePanel } from "@/components/project/stripe-panel";
import { SnapshotPanel } from "@/components/project/snapshot-panel";

export type ProjectSettingsTabId =
  | "general"
  | "domains"
  | "analytics"
  | "database"
  | "authentication"
  | "stripe"
  | "secrets"
  | "user-management"
  | "file-storage"
  | "knowledge"
  | "backups"
  | "history";

const TABS: {
  id: ProjectSettingsTabId;
  label: string;
  icon: typeof SettingsIcon;
}[] = [
  { id: "general", label: "Ogólne", icon: SettingsIcon },
  { id: "domains", label: "Domeny i hosting", icon: Globe },
  { id: "analytics", label: "Analityka", icon: BarChart3 },
  { id: "database", label: "Baza danych", icon: Database },
  { id: "authentication", label: "Uwierzytelnianie", icon: ShieldCheck },
  { id: "stripe", label: "Płatności (Stripe)", icon: CreditCard },
  { id: "secrets", label: "Sekrety", icon: Lock },
  { id: "user-management", label: "Użytkownicy", icon: Users },
  { id: "file-storage", label: "Pliki", icon: FolderOpen },
  { id: "knowledge", label: "Wiedza", icon: Sparkles },
  { id: "history", label: "Historia (snapshoty)", icon: History },
  { id: "backups", label: "Kopie zapasowe", icon: History },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  /**
   * Optional handler - gdy klikniety zostanie "Otwórz panel domen" w tabie
   * domain, mozemy delegowac do istniejacego `DomainsDialog`. Jezeli nie ma -
   * użytkownik widzi prosty form w tabie.
   */
  onOpenDomains?: () => void;
  initialTab?: ProjectSettingsTabId;
};

export function ProjectSettingsDialog({
  open,
  onOpenChange,
  project,
  onOpenDomains,
  initialTab = "general",
}: Props) {
  const [activeTab, setActiveTab] = useState<ProjectSettingsTabId>(initialTab);

  // Reset to initial tab when dialog reopens (so URL ?settings=analytics works).
  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, initialTab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-beige/15 bg-card p-0 sm:max-w-[1100px]">
        <div className="flex h-[680px] max-h-[88vh]">
          {/* Left nav */}
          <aside className="flex w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-beige/10 bg-background/40 p-3">
            <DialogTitle className="px-2 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Ustawienia projektu
            </DialogTitle>
            <DialogDescription className="sr-only">
              Konfiguracja domen, bazy danych, płatności i innych funkcji
              projektu w wybitnastrona.pl
            </DialogDescription>
            <nav className="mt-1 flex flex-col gap-0.5">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
                      isActive
                        ? "bg-beige/10 text-beige"
                        : "text-foreground/70 hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Right pane */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {activeTab === "general" && (
              <GeneralTabContent project={project} />
            )}
            {activeTab === "domains" && (
              <DomainsTabContent
                project={project}
                onOpenDomains={onOpenDomains}
              />
            )}
            {activeTab === "analytics" && (
              <AnalyticsDashboard projectId={project.id} />
            )}
            {activeTab === "database" && <DatabasePanel project={project} />}
            {activeTab === "stripe" && <StripePanel project={project} />}
            {activeTab === "authentication" && (
              <AuthTabContent project={project} />
            )}
            {activeTab === "secrets" && (
              <SecretsTabContent project={project} />
            )}
            {activeTab === "user-management" && <ComingSoonCard
              title="Zarządzanie użytkownikami"
              description="Zaproszenia do projektu, role i permissions. Wkrótce."
              icon={Users}
            />}
            {activeTab === "file-storage" && <FileStorageTabContent />}
            {activeTab === "history" && (
              <HistoryTabContent project={project} />
            )}
            {activeTab === "knowledge" && <ComingSoonCard
              title="Baza wiedzy"
              description="Zaladuj dokumentacje / PDF-y do kontekstu AI dla tego projektu. Wkrótce."
              icon={Sparkles}
            />}
            {activeTab === "backups" && <ComingSoonCard
              title="Kopie zapasowe"
              description="Automatyczne snapshoty wygenerowanego kodu + DB. Wkrótce."
              icon={History}
            />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────── Tab content components ───────────────────────── */

function GeneralTabContent({ project }: { project: Project }) {
  const router = useRouter();
  const [title, setTitle] = useState(project.title);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-base font-medium text-foreground">
          Ogolne ustawienia projektu
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Podstawowe informacje o projekcie i wybor agenta AI.
        </p>
      </header>

      <section className="space-y-3">
        <Label htmlFor="proj-name">Nazwa projektu</Label>
        <div className="flex items-center gap-2">
          <Input
            id="proj-name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="max-w-md"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || !title.trim() || title.trim() === project.title}
            className="bg-beige text-beige-foreground hover:bg-beige/90"
          >
            {saved ? "Zapisano" : saving ? "..." : (<><Save className="h-3.5 w-3.5" />Zapisz</>)}
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <Label>Agent projektu</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            className="flex flex-col items-start gap-1 rounded-md border border-beige/40 bg-beige/5 p-3 text-left ring-1 ring-beige/20"
          >
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-beige">
              <Sparkles className="h-3.5 w-3.5" />
              Claude Agent
            </span>
            <span className="text-[10px] text-muted-foreground">
              Domyslny - najlepsza jakosc kodu.
            </span>
          </button>
          <button
            type="button"
            disabled
            className="flex flex-col items-start gap-1 rounded-md border border-beige/15 bg-card/40 p-3 text-left opacity-60"
          >
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Server className="h-3.5 w-3.5" />
              Codex
              <span className="ml-1 rounded-full border border-beige/20 px-1.5 text-[9px] uppercase tracking-wider">
                Wkrótce
              </span>
            </span>
          </button>
          <button
            type="button"
            disabled
            className="flex flex-col items-start gap-1 rounded-md border border-beige/15 bg-card/40 p-3 text-left opacity-60"
          >
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              v1 Agent (legacy)
            </span>
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <Label>Kontekst</Label>
        <div className="rounded-md border border-beige/10 bg-card/40 p-3 text-xs text-muted-foreground">
          Reset kontekstu czyscic historie chatu, ale nie wplywa na pliki
          projektu. Otwórz panel czatu - przycisk <span className="font-medium text-foreground">"Wyczysc czat"</span>.
        </div>
      </section>
    </div>
  );
}

function DomainsTabContent({
  project,
  onOpenDomains,
}: {
  project: Project;
  onOpenDomains?: () => void;
}) {
  const subdomain = project.slug ? `${project.slug}.wybitny.website` : null;
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-base font-medium text-foreground">
          Domeny i hosting
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Twoj projekt jest dostepny pod subdomena{" "}
          <span className="font-mono text-foreground">.wybitny.website</span>.
          Aby uzyc własnej domeny - kup nowa lub podepnij istniejaca.
        </p>
      </header>

      <section className="space-y-2">
        <Label>Subdomena wybitny.website</Label>
        {subdomain ? (
          <a
            href={`https://${subdomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-beige/15 bg-background/60 px-3 py-2 text-xs text-beige hover:border-beige/40"
          >
            <Globe className="h-3.5 w-3.5" />
            https://{subdomain}
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">
            Opublikuj projekt zeby zobaczyc adres.
          </p>
        )}
      </section>

      <section className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => onOpenDomains?.()}
          className="bg-[#3b82f6] text-white hover:bg-[#2563eb]"
        >
          Kup nowa domene
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenDomains?.()}
          className="border-beige/20"
        >
          Podepnij własna domene
        </Button>
      </section>

      <section className="space-y-2">
        <Label>Ustawienia hostingu</Label>
        <div className="flex items-start justify-between gap-3 rounded-md border border-beige/10 bg-card/40 p-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {project.is_public ? "Wycofaj publikacje" : "Status: niepublikowany"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {project.is_public
                ? "Strona jest publicznie dostepna. Cofnij publikacje aby ja schowac."
                : "Opublikuj projekt z poziomu przycisku 'Opublikuj' w topbarze."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Tabela użytkownikow aplikacji wygenerowanej w projekcie. Pobiera dane z
 * `/api/projects/[id]/app-users` (server-side: autoryzacja + filtr
 * `project_id`). Kolumny sa dynamiczne - pobierane z odpowiedzi.
 */
function AuthTabContent({ project }: { project: Project }) {
  type AppUsersResponse = {
    enabled: boolean;
    columns: string[];
    rows: Record<string, unknown>[];
    count?: number;
    message?: string;
  };

  const [state, setState] = useState<AppUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/app-users`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        setState(null);
      } else {
        const json = (await res.json()) as AppUsersResponse;
        setState(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-foreground">
            Uwierzytelnianie - użytkownicy aplikacji
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tabela użytkownikow z dzielonej Wybitnej Bazy Danych (filtr{" "}
            <code className="font-mono">project_id</code>). Maksymalnie 100
            wierszy.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          className="border-beige/20"
        >
          {loading ? "..." : "Odśwież"}
        </Button>
      </header>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {!loading && state && state.rows.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-beige/15 bg-card/40 py-12 text-center">
          <ShieldCheck className="h-7 w-7 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">Brak danych</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {state.message ??
              "Brak tabeli `users` w bazie lub zero zarejestrowanych użytkownikow. Poles AI o jej utworzenie."}
          </p>
        </div>
      )}

      {state && state.rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-beige/15 bg-card/40">
          <table className="min-w-full text-xs">
            <thead className="border-b border-beige/10 bg-background/40">
              <tr>
                {state.columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-beige/10">
              {state.rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/5">
                  {state.columns.map((col) => {
                    const v = row[col];
                    const display =
                      v == null
                        ? ""
                        : typeof v === "object"
                          ? JSON.stringify(v)
                          : String(v);
                    return (
                      <td
                        key={col}
                        className="max-w-[200px] truncate px-3 py-2 font-mono text-foreground/90"
                        title={display}
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-beige/10 px-3 py-1.5 text-[10px] text-muted-foreground">
            {state.rows.length} {state.rows.length === 1 ? "wiersz" : "wierszy"}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Sekrety - czyta pliki `.env*` bezposrednio z `project.files`.
 *
 * Bezpieczenstwo: `project.files` jest dostarczany jako prop tylko gdy
 * `getProject(id)` na serwerze potwierdzi właściciela (sprawdzane w
 * `app/project/[id]/page.tsx` przez `getProject` + RLS w Supabase). Klient
 * nigdy nie pobiera plikow obcych projektów.
 *
 * Wartosci sa zamaskowane domyslnie. Klucze wrazliwe (zawierajace SECRET,
 * KEY, TOKEN, PASSWORD, STRIPE) wymagaja jawnego "Pokaż".
 */
const ENV_FILE_PATTERNS = [
  /(^|\/)\.env$/i,
  /(^|\/)\.env\.local$/i,
  /(^|\/)\.env\.production$/i,
  /(^|\/)\.env\.development$/i,
];

const SENSITIVE_KEY_RE = /(SECRET|KEY|TOKEN|PASSWORD|STRIPE)/i;

function parseEnvContent(
  content: string,
): { key: string; value: string }[] {
  const pairs: { key: string; value: string }[] = [];
  const lines = content.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    pairs.push({ key, value });
  }
  return pairs;
}

function maskValue(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}${"*".repeat(Math.min(value.length - 4, 12))}${value.slice(-2)}`;
}

function SecretsTabContent({ project }: { project: Project }) {
  type ParsedFile = {
    path: string;
    pairs: { key: string; value: string }[];
  };

  function parseFromProject(): ParsedFile[] {
    const files = project.files ?? {};
    const out: ParsedFile[] = [];
    for (const path of Object.keys(files)) {
      if (!ENV_FILE_PATTERNS.some((re) => re.test(path))) continue;
      const code = files[path]?.code ?? "";
      out.push({ path, pairs: parseEnvContent(code) });
    }
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }

  const [parsed, setParsed] = useState<ParsedFile[]>(() => parseFromProject());
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  function rowKey(path: string, key: string) {
    return `${path}::${key}`;
  }

  function refresh() {
    setParsed(parseFromProject());
    setRevealed({});
  }

  const total = parsed.reduce((n, f) => n + f.pairs.length, 0);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-foreground">
            Sekrety i zmienne srodowiskowe
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Wartosci wczytywane z plikow{" "}
            <code className="font-mono text-foreground/80">.env*</code> w
            projekcie. Klucze wrazliwe (KEY/SECRET/TOKEN/PASSWORD/STRIPE)
            domyslnie ukryte.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refresh}
          className="border-beige/20"
        >
          Odśwież
        </Button>
      </header>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-beige/15 bg-card/40 py-12 text-center">
          <Lock className="h-7 w-7 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">
            Brak plikow .env w projekcie
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Dodaj plik <code className="font-mono">.env.local</code> z parami{" "}
            <code className="font-mono">KEY=VALUE</code> aby zobaczyc je tutaj.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {parsed.map((file) => (
            <div
              key={file.path}
              className="rounded-lg border border-beige/15 bg-card/40"
            >
              <div className="flex items-center justify-between gap-2 border-b border-beige/10 px-3 py-2">
                <code className="font-mono text-xs text-foreground">
                  {file.path}
                </code>
                <span className="text-[10px] text-muted-foreground">
                  {file.pairs.length} {file.pairs.length === 1 ? "zmienna" : "zmiennych"}
                </span>
              </div>
              <ul className="divide-y divide-beige/10">
                {file.pairs.length === 0 && (
                  <li className="px-3 py-2 text-xs text-muted-foreground">
                    Pusty plik.
                  </li>
                )}
                {file.pairs.map(({ key, value }) => {
                  const id = rowKey(file.path, key);
                  const isRevealed = !!revealed[id];
                  const sensitive = SENSITIVE_KEY_RE.test(key);
                  const display = isRevealed ? value : maskValue(value);
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-2 px-3 py-2 text-xs"
                    >
                      <code className="min-w-0 flex-1 truncate font-mono text-foreground/90">
                        {key}
                      </code>
                      <code className="max-w-[60%] truncate font-mono text-muted-foreground">
                        {display || <em className="opacity-60">(pusto)</em>}
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          setRevealed((r) => ({ ...r, [id]: !r[id] }))
                        }
                        className="shrink-0 rounded border border-beige/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-white/5 hover:text-beige"
                      >
                        {isRevealed
                          ? "Ukryj"
                          : sensitive
                            ? "Pokaż"
                            : "Pokaż"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <p className="rounded-md border border-beige/10 bg-background/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Sekrety widoczne tylko dla właściciela projektu - backend weryfikuje
        autoryzacje na poziomie `getProject(id)` przed wyslaniem `files` do
        klienta.
      </p>
    </div>
  );
}

function HistoryTabContent({ project }: { project: Project }) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-base font-medium text-foreground">
          Historia zmian (snapshoty)
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Kazdy build tworzy snapshot kodu projektu. Możesz porownac go z
          aktualnymi plikami albo przywrocic.
        </p>
      </header>
      <SnapshotPanel
        projectId={project.id}
        currentFiles={project.files}
        onRestored={() => router.refresh()}
      />
    </div>
  );
}

function FileStorageTabContent() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-base font-medium text-foreground">File Storage</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pliki przechowywane przez Twoja aplikacje (np. uploady użytkownikow).
        </p>
      </header>
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-beige/15 bg-card/40 py-12 text-center">
        <Cloud className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">Brak plikow</p>
        <p className="text-xs text-muted-foreground">
          Możesz poprosic Wybitna AI o utworzenie bucketow w bazie danych.
        </p>
      </div>
    </div>
  );
}

function ComingSoonCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: typeof SettingsIcon;
}) {
  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-base font-medium text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </header>
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-beige/15 bg-card/40 py-16 text-center">
        <Icon className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-foreground">Wkrótce</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Pracujemy nad ta funkcja. Możesz dac znac co chcialbys zobaczyc na{" "}
          <a
            href="mailto:hello@wybitnastrona.pl"
            className="text-beige hover:underline"
          >
            hello@wybitnastrona.pl
          </a>
          .
        </p>
      </div>
    </div>
  );
}
