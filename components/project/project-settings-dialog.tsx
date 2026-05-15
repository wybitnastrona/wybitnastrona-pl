"use client";

/**
 * Wybitna-style "Ustawienia projektu" — modal w stylu Bolt.new:
 * lewa nawigacja + prawa zawartosc. Skupia w jednym miejscu wszystkie
 * konfiguracje per-projekt: Ogolne, Domeny, Analytics, Database, Auth, Stripe,
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
  | "backups";

const TABS: {
  id: ProjectSettingsTabId;
  label: string;
  icon: typeof SettingsIcon;
}[] = [
  { id: "general", label: "Ogolne", icon: SettingsIcon },
  { id: "domains", label: "Domeny i hosting", icon: Globe },
  { id: "analytics", label: "Analityka", icon: BarChart3 },
  { id: "database", label: "Baza danych", icon: Database },
  { id: "authentication", label: "Uwierzytelnianie", icon: ShieldCheck },
  { id: "stripe", label: "Platnosci (Stripe)", icon: CreditCard },
  { id: "secrets", label: "Sekrety", icon: Lock },
  { id: "user-management", label: "Uzytkownicy", icon: Users },
  { id: "file-storage", label: "Pliki", icon: FolderOpen },
  { id: "knowledge", label: "Wiedza", icon: Sparkles },
  { id: "backups", label: "Kopie zapasowe", icon: History },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  /**
   * Optional handler — gdy klikniety zostanie "Otworz panel domen" w tabie
   * domain, mozemy delegowac do istniejacego `DomainsDialog`. Jezeli nie ma —
   * uzytkownik widzi prosty form w tabie.
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
              Konfiguracja domen, bazy danych, platnosci i innych funkcji
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
            {activeTab === "authentication" && <ComingSoonCard
              title="Uwierzytelnianie"
              description="Zarzadzaj logowaniem uzytkownikow Twojej aplikacji — providerzy OAuth (Google, GitHub), email + magic link. Wkrotce."
              icon={ShieldCheck}
            />}
            {activeTab === "secrets" && <ComingSoonCard
              title="Sekrety"
              description="Bezpieczny storage zmiennych srodowiskowych dla wygenerowanej aplikacji. Wkrotce."
              icon={Lock}
            />}
            {activeTab === "user-management" && <ComingSoonCard
              title="Zarzadzanie uzytkownikami"
              description="Zaproszenia do projektu, role i permissions. Wkrotce."
              icon={Users}
            />}
            {activeTab === "file-storage" && <FileStorageTabContent />}
            {activeTab === "knowledge" && <ComingSoonCard
              title="Baza wiedzy"
              description="Zaladuj dokumentacje / PDF-y do kontekstu AI dla tego projektu. Wkrotce."
              icon={Sparkles}
            />}
            {activeTab === "backups" && <ComingSoonCard
              title="Kopie zapasowe"
              description="Automatyczne snapshoty wygenerowanego kodu + DB. Wkrotce."
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
              Domyslny — najlepsza jakosc kodu.
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
                Wkrotce
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
          projektu. Otworz panel czatu — przycisk <span className="font-medium text-foreground">"Wyczysc czat"</span>.
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
          Aby uzyc wlasnej domeny — kup nowa lub podepnij istniejaca.
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
          Podepnij wlasna domene
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

function FileStorageTabContent() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-base font-medium text-foreground">File Storage</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pliki przechowywane przez Twoja aplikacje (np. uploady uzytkownikow).
        </p>
      </header>
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-beige/15 bg-card/40 py-12 text-center">
        <Cloud className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">Brak plikow</p>
        <p className="text-xs text-muted-foreground">
          Mozesz poprosic Wybitna AI o utworzenie bucketow w bazie danych.
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
        <p className="text-sm font-medium text-foreground">Wkrotce</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Pracujemy nad ta funkcja. Mozesz dac znac co chcialbys zobaczyc na{" "}
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
