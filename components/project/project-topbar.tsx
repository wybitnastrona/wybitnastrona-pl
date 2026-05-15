"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  FileArchive,
  FileText,
  Globe,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Settings,
  Share2,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { GithubIcon } from "@/components/brand-icons";
import { GithubButton } from "@/components/auth/github-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project } from "@/lib/types/project";
import { MobileQrButton } from "@/components/project/mobile-qr";
import { ProjectSwitcher } from "@/components/project/project-switcher";
import { ProjectPublishView } from "@/components/project/publish/project-publish-view";
import {
  ProjectSettingsDialog,
  type ProjectSettingsTabId,
} from "@/components/project/project-settings-dialog";

type Props = {
  project: Project;
  rootDomain: string;
  publishDomain: string;
  appUrl: string;
  domainPartnerUrl: string;
};

function buildSubdomainUrl(slug: string, domain: string): string {
  const protocol = domain.includes("localhost") ? "http" : "https";
  return `${protocol}://${slug}.${domain}`;
}

/**
 * Generuje nowy auto-slug po stronie klienta (10 znakow alfanum).
 * Trzyma sie tego samego ksztaltu co server (lib/projects.ts → AUTO_SLUG_REGEX).
 */
function generateClientAutoSlug(): string {
  const alphabet =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function ProjectTopbar({
  project,
  rootDomain,
  publishDomain,
  appUrl,
  domainPartnerUrl,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [publishOpen, setPublishOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [domainsOpen, setDomainsOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] =
    useState<ProjectSettingsTabId>("general");
  const [isPro, setIsPro] = useState<boolean | null>(null);

  function openSettings(tab: ProjectSettingsTabId = "general") {
    setSettingsTab(tab);
    setSettingsOpen(true);
  }

  const previewUrl =
    project.is_public && project.slug
      ? buildSubdomainUrl(project.slug, publishDomain)
      : null;

  // Pozwala innym komponentom (np. WorkspaceCanvas) otworzyc PublishDialog
  // bez prop drilling — przez globalny event window.
  useEffect(() => {
    function openPublish() {
      setPublishOpen(true);
    }
    window.addEventListener("wybitna:request-publish", openPublish);
    return () =>
      window.removeEventListener("wybitna:request-publish", openPublish);
  }, []);

  // Auto-open settings z URL (?settings=analytics) — uzywane przez redirect
  // ze starej strony /project/[id]/analytics.
  useEffect(() => {
    const tab = searchParams.get("settings");
    if (
      tab === "general" ||
      tab === "domains" ||
      tab === "analytics" ||
      tab === "database" ||
      tab === "authentication" ||
      tab === "stripe" ||
      tab === "secrets" ||
      tab === "user-management" ||
      tab === "file-storage" ||
      tab === "knowledge" ||
      tab === "backups"
    ) {
      setSettingsTab(tab);
      setSettingsOpen(true);
    }
  }, [searchParams]);

  // Status PRO sluzy do gatowania ZIP exportu (klient-side hint).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/points")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { isPro?: boolean } | null) => {
        if (!cancelled && data && typeof data.isPro === "boolean") {
          setIsPro(data.isPro);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function handleZipDownload() {
    if (isPro === false) {
      // Gentle nudge — przekieruj na /pricing.
      const ok = window.confirm(
        "Pobieranie kodu jako ZIP jest dostepne w planie PRO. Przejsc do strony planow?",
      );
      if (ok) router.push("/pricing");
      return;
    }
    window.open(`/api/export/zip?projectId=${project.id}`, "_blank");
  }

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-beige/10 bg-background/80 px-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/dashboard"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-white/5 hover:text-beige"
          aria-label="Wroc do dashboardu"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        {/* Project switcher (Lovable-style) */}
        <ProjectSwitcher
          currentProject={{
            id: project.id,
            title: project.title,
            updated_at: project.updated_at,
          }}
        />

        {project.is_public && project.slug && (
          <Link
            href={buildSubdomainUrl(project.slug, publishDomain)}
            target="_blank"
            className="hidden h-6 items-center gap-1 rounded-full border border-beige/20 px-2 text-xs text-beige/80 transition hover:border-beige/40 md:inline-flex"
          >
            <Globe className="h-3 w-3" />
            Live
          </Link>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <MobileQrButton
          previewUrl={previewUrl}
          isExpo={project.template === "expo"}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => openSettings("general")}
          className="text-foreground/80 hover:bg-white/5"
          aria-label="Ustawienia projektu"
          title="Ustawienia projektu"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShareOpen(true)}
          className="text-foreground/80 hover:bg-white/5"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Udostepnij</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-foreground/80 transition hover:bg-white/5"
            aria-label="Wiecej akcji"
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                Ustawienia projektu
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openSettings("general")}>
                <Settings className="h-3.5 w-3.5" />
                Wszystkie ustawienia
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openSettings("domains")}>
                <Globe className="h-3.5 w-3.5" />
                Domeny i hosting
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setContextOpen(true)}>
                <FileText className="h-3.5 w-3.5" />
                System Context
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                Eksport
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={handleZipDownload}>
                <FileArchive className="h-3.5 w-3.5" />
                Pobierz ZIP
                {isPro === false && (
                  <span className="ml-auto rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-amber-200">
                    PRO
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGithubOpen(true)}>
                <GithubIcon className="h-3.5 w-3.5" />
                Push do GitHub
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => openSettings("analytics")}>
                <BarChart3 className="h-3.5 w-3.5" />
                Analityka
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/project/${project.id}/variants`)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                A/B test (3 warianty)
              </DropdownMenuItem>
              {previewUrl && (
                <DropdownMenuItem onClick={() => window.open(previewUrl, "_blank")}>
                  <Smartphone className="h-3.5 w-3.5" />
                  Otwórz live
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          size="sm"
          onClick={() => setPublishOpen(true)}
          className="bg-beige text-beige-foreground hover:bg-beige/90"
        >
          <Globe className="h-3.5 w-3.5" />
          {project.is_public ? "Zarzadzaj" : "Opublikuj"}
        </Button>
      </div>

      {/* Dla projektow natywnych (iOS / Android / Watch / TV / Vision) zamiast
          zwyklego PublishDialog otwieramy pelne flow submission. */}
      {isNativeProject(project.mode) ? (
        <NativePublishDialog
          open={publishOpen}
          onOpenChange={setPublishOpen}
          project={project}
        />
      ) : (
        <PublishDialog
          open={publishOpen}
          onOpenChange={setPublishOpen}
          project={project}
          publishDomain={publishDomain}
          onOpenDomains={() => {
            setPublishOpen(false);
            setDomainsOpen(true);
          }}
        />
      )}

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        project={project}
        appUrl={appUrl}
        publishDomain={publishDomain}
      />

      <DomainsDialog
        open={domainsOpen}
        onOpenChange={setDomainsOpen}
        project={project}
        rootDomain={rootDomain}
        publishDomain={publishDomain}
        domainPartnerUrl={domainPartnerUrl}
      />

      <GithubDialog
        open={githubOpen}
        onOpenChange={setGithubOpen}
        project={project}
      />

      <ContextDialog
        open={contextOpen}
        onOpenChange={setContextOpen}
        project={project}
      />

      <ProjectSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        project={project}
        initialTab={settingsTab}
        onOpenDomains={() => {
          setSettingsOpen(false);
          setDomainsOpen(true);
        }}
      />
    </header>
  );
}

const CONTEXT_MAX_LEN = 2000;

function ContextDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
}) {
  const [value, setValue] = useState<string>(
    project.custom_system_context ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/projects/${project.id}/context`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customSystemContext: value.slice(0, CONTEXT_MAX_LEN) }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(data.error ?? "Nie udalo sie zapisac");
        setSaving(false);
        return;
      }
      setSaved(true);
      setTimeout(() => {
        onOpenChange(false);
        setSaved(false);
      }, 800);
    } catch {
      alert("Blad sieci");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Custom System Context</DialogTitle>
          <DialogDescription>
            Instrukcje doklejane do system promptu AI przy KAZDEJ generacji
            w tym projekcie. Stosuj zwiezle wytyczne stylistyczne lub
            techniczne (np. zawsze uzywaj Supabase do storage; trzymaj
            paletke czarno-bezowa; nie dodawaj cookie bannerow).
          </DialogDescription>
        </DialogHeader>

        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, CONTEXT_MAX_LEN))}
          rows={8}
          placeholder="Np: zawsze uzywaj kolorystyki czarno-bezowej; stylizuj w stylu Notion; nie dodawaj cookie bannerow..."
          className="block w-full resize-none rounded-lg border border-beige/15 bg-background/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-beige/40 focus:outline-none"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground/70">
          <span>{value.trim() ? "Aktywny" : "Brak (puste = wylaczone)"}</span>
          <span>
            {value.length} / {CONTEXT_MAX_LEN}
          </span>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-beige text-beige-foreground hover:bg-beige/90"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <Check className="h-3.5 w-3.5" />
            ) : null}
            {saved ? "Zapisano" : "Zapisz"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GithubDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
}) {
  const [repoName, setRepoName] = useState(
    project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  );
  const [isPrivate, setIsPrivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsGithubAuth, setNeedsGithubAuth] = useState(false);

  async function handlePush() {
    setError(null);
    setNeedsGithubAuth(false);
    setBusy(true);
    try {
      const res = await fetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          repoName,
          private: isPrivate,
        }),
      });
      const data = (await res.json()) as {
        url?: string;
        error?: string;
        code?: string;
      };
      if (data.url) {
        setResult(data.url);
      } else if (data.code === "github_token_missing") {
        setNeedsGithubAuth(true);
      } else {
        setError(data.error ?? "Push nie powiódł się");
      }
    } catch {
      setError("Błąd sieci");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-beige/20 bg-card sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Push do GitHub</DialogTitle>
          <DialogDescription>
            Tworzymy nowe repozytorium i wypychamy wszystkie pliki projektu. Wymaga
            zalogowania przez GitHub OAuth z dostępem do <code>repo</code>.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              <p className="font-medium">Repozytorium utworzone</p>
              <a
                href={result}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all text-xs underline hover:text-emerald-100"
              >
                {result}
              </a>
            </div>
          </div>
        ) : needsGithubAuth ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <p className="font-medium">Połącz konto GitHub</p>
              <p className="mt-1 text-xs">
                Nie mamy tokenu z dostępem do <code>repo</code>. Zaloguj się
                ponownie przez GitHub — token zostanie zapisany w sesji i Push
                zadziała.
              </p>
            </div>
            <GithubButton label="Połącz z GitHub" />
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Nazwa repozytorium
              </label>
              <Input
                value={repoName}
                onChange={(e) =>
                  setRepoName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, "-"))
                }
                placeholder="moja-strona"
                className="font-mono text-xs"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-4 w-4 cursor-pointer"
              />
              Prywatne repozytorium
            </label>
            {error && (
              <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">
                {error}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                setResult(null);
              }}
              className="bg-beige text-beige-foreground hover:bg-beige/90"
            >
              Zamknij
            </Button>
          ) : needsGithubAuth ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Anuluj
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handlePush}
              disabled={busy || !repoName.trim()}
              className="bg-beige text-beige-foreground hover:bg-beige/90"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <GithubIcon className="h-3.5 w-3.5" />
              Wypchnij
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PublishDialog({
  open,
  onOpenChange,
  project,
  publishDomain,
  onOpenDomains,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  publishDomain: string;
  onOpenDomains: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [slug, setSlug] = useState(project.slug ?? "");
  const [slugDraft, setSlugDraft] = useState(project.slug ?? "");
  const [isPublic, setIsPublic] = useState(project.is_public);
  const [justPublished, setJustPublished] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  const slugDraftNormalized = slugDraft
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  const slugDraftValid =
    /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/.test(slugDraftNormalized);

  // Live check dostepnosci slug (debounce 350ms, anuluje poprzedni fetch).
  type ServerCheck =
    | { status: "idle" }
    | { status: "checking" }
    | { status: "available" }
    | { status: "taken"; reason: string };
  const [serverCheck, setServerCheck] = useState<ServerCheck>({
    status: "idle",
  });

  // shouldCheck = warunki sa spelnione zeby trafic do API.
  const shouldCheck =
    slugDraftValid && slugDraftNormalized !== (project.slug ?? "");

  // Derived state — gdy nie ma warunkow do checku, status zawsze "idle"
  // (server-state moze byc stale z poprzedniego draftu — ignorujemy).
  const slugCheck: ServerCheck = shouldCheck
    ? serverCheck
    : { status: "idle" };

  useEffect(() => {
    if (!shouldCheck) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      setServerCheck({ status: "checking" });
      try {
        const r = await fetch(
          `/api/projects/check-slug?slug=${encodeURIComponent(slugDraftNormalized)}&excludeProjectId=${project.id}`,
        );
        if (cancelled) return;
        if (!r.ok) {
          setServerCheck({
            status: "taken",
            reason: "Nie udalo sie sprawdzic — sprobuj ponownie.",
          });
          return;
        }
        const data = (await r.json()) as {
          available: boolean;
          valid: boolean;
          error?: string;
        };
        if (data.available) {
          setServerCheck({ status: "available" });
        } else {
          setServerCheck({
            status: "taken",
            reason: data.error ?? "Ta subdomena jest juz zajeta.",
          });
        }
      } catch {
        if (!cancelled)
          setServerCheck({
            status: "taken",
            reason: "Blad sieci podczas sprawdzania.",
          });
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [shouldCheck, slugDraftNormalized, project.id]);

  const slugBlocked = slugCheck.status === "taken";

  async function handlePublish() {
    setSlugError(null);
    if (slugDraftNormalized && !slugDraftValid) {
      setSlugError(
        "Subdomena musi miec 3-32 znakow (a-z, 0-9, -), nie zaczynac/konczyc myslnikiem.",
      );
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          slugDraftNormalized ? { slug: slugDraftNormalized } : {},
        ),
      });
      if (res.ok) {
        const data = (await res.json()) as { slug: string };
        setSlug(data.slug);
        setSlugDraft(data.slug);
        setIsPublic(true);
        setJustPublished(true);
        router.refresh();
      } else {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };
        setSlugError(err.error ?? "Nie udalo sie opublikowac. Sprobuj ponownie.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUnpublish() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/publish`, {
        method: "DELETE",
      });
      if (res.ok) {
        setIsPublic(false);
        setJustPublished(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  const url = slug ? buildSubdomainUrl(slug, publishDomain) : "";
  const previewUrl = slugDraftNormalized
    ? buildSubdomainUrl(slugDraftNormalized, publishDomain)
    : `https://{subdomena}.${publishDomain}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-beige/20 bg-card sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {justPublished ? "Strona opublikowana" : "Publikacja projektu"}
          </DialogTitle>
          <DialogDescription>
            {justPublished
              ? "Twoja strona jest dostepna w internecie pod adresem ponizej."
              : `Publikujemy projekt pod adresem {slug}.${publishDomain}.`}
          </DialogDescription>
        </DialogHeader>

        {isPublic && slug ? (
          <div className="space-y-4">
            {justPublished && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Gotowe. Mozesz teraz udostepnic link lub podpiac wlasna domene.</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                value={url}
                readOnly
                className="font-mono text-xs"
              />
              <CopyButton value={url} />
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                onClick={() => window.open(url, "_blank")}
                aria-label="Otworz w nowej karcie"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="rounded-lg border border-beige/15 bg-background/60 p-3 text-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">Zmien subdomene</p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSlugDraft(generateClientAutoSlug());
                    setSlugError(null);
                  }}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                  title="Wygeneruj nowa losowa subdomene"
                >
                  <RotateCcw className="h-3 w-3" />
                  Przywroc auto-slug
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={slugDraft}
                  onChange={(e) => {
                    setSlugDraft(e.target.value);
                    setSlugError(null);
                  }}
                  placeholder={slug}
                  className="font-mono text-xs"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <span className="shrink-0 text-xs text-muted-foreground">
                  .{publishDomain}
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handlePublish}
                  disabled={
                    loading ||
                    slugDraftNormalized === slug ||
                    !slugDraftValid ||
                    slugBlocked
                  }
                  className="bg-beige text-beige-foreground hover:bg-beige/90"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Zapisz"
                  )}
                </Button>
              </div>
              <SlugStatus
                check={slugCheck}
                slugError={slugError}
                isDirty={slugDraftNormalized !== slug}
              />
            </div>
            <div className="rounded-lg border border-beige/15 bg-background/60 p-3 text-sm">
              <p className="font-medium text-foreground">
                Wlasna domena lub zakup nowej
              </p>
              <p className="mt-1 text-muted-foreground">
                Aby podpiac wlasna domene (np. twojasklep.pl) lub kupic
                ja przez wybitnastrona.pl, otworz panel domen.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={onOpenDomains}
                  className="bg-beige text-beige-foreground hover:bg-beige/90"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Domeny i hosting
                </Button>
                <Link
                  href="/pricing"
                  className="inline-flex h-7 items-center justify-center rounded-md border border-beige/20 px-2.5 text-xs font-medium text-beige/90 transition hover:border-beige/40 hover:bg-white/5"
                >
                  Zobacz plany
                </Link>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Strona jest publicznie widoczna. Mozesz ja w kazdej chwili
              wycofac.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Wybierz nazwe subdomeny lub zostaw puste — wygenerujemy losowy
              adres. Subdomena musi miec 3-32 znakow (a-z, 0-9, -).
            </p>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                Twoj adres
              </p>
              <p className="mb-2 truncate font-mono text-xs text-beige/80">
                {previewUrl}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={slugDraft}
                  onChange={(e) => {
                    setSlugDraft(e.target.value);
                    setSlugError(null);
                  }}
                  placeholder="np. moj-salon"
                  className="font-mono text-xs"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <span className="shrink-0 text-xs text-muted-foreground">
                  .{publishDomain}
                </span>
              </div>
              <SlugStatus
                check={slugCheck}
                slugError={slugError}
                isDirty={slugDraftNormalized.length > 0}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {isPublic ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleUnpublish}
              disabled={loading}
              className="text-red-300 hover:bg-red-500/10"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Wycofaj publikacje
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handlePublish}
              disabled={
                loading ||
                (slugDraftNormalized.length > 0 && !slugDraftValid) ||
                slugBlocked
              }
              className="bg-beige text-beige-foreground hover:bg-beige/90"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Opublikuj
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * SlugStatus — line podpowiedzi pod inputem subdomeny.
 * Pokazuje: checking spinner / available green / taken red / lokalny slugError.
 */
function SlugStatus({
  check,
  slugError,
  isDirty,
}: {
  check:
    | { status: "idle" }
    | { status: "checking" }
    | { status: "available" }
    | { status: "taken"; reason: string };
  slugError: string | null;
  isDirty: boolean;
}) {
  if (slugError) {
    return <p className="mt-2 text-xs text-rose-300">{slugError}</p>;
  }
  if (!isDirty) return null;
  if (check.status === "checking") {
    return (
      <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Sprawdzam dostępność…
      </p>
    );
  }
  if (check.status === "available") {
    return (
      <p className="mt-2 text-xs text-emerald-300">
        Subdomena dostępna — możesz publikować.
      </p>
    );
  }
  if (check.status === "taken") {
    return <p className="mt-2 text-xs text-rose-300">{check.reason}</p>;
  }
  return null;
}

function ShareDialog({
  open,
  onOpenChange,
  project,
  appUrl,
  publishDomain,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  appUrl: string;
  publishDomain: string;
}) {
  const shareUrl =
    project.is_public && project.slug
      ? `${appUrl}/p/${project.slug}`
      : "";
  const subdomainUrl =
    project.is_public && project.slug
      ? buildSubdomainUrl(project.slug, publishDomain)
      : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-beige/20 bg-card sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Udostepnij projekt</DialogTitle>
          <DialogDescription>
            {project.is_public
              ? "Skopiuj link i wyslij komu chcesz."
              : "Aby udostepnic, najpierw opublikuj projekt."}
          </DialogDescription>
        </DialogHeader>

        {project.is_public && project.slug ? (
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                Strona na zywo
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={subdomainUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <CopyButton value={subdomainUrl} />
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                Strona z opisem (z navbarem)
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <CopyButton value={shareUrl} />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Otworz dialog Opublikuj, aby udostepnic projekt publicznie.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DomainsDialog({
  open,
  onOpenChange,
  project,
  rootDomain,
  publishDomain,
  domainPartnerUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  rootDomain: string;
  publishDomain: string;
  domainPartnerUrl: string;
}) {
  const router = useRouter();
  const [domain, setDomain] = useState(project.custom_domain ?? "");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{
    verified: boolean;
    misconfigured?: boolean;
    expectedCnames?: string[];
    expectedAValues?: string[];
  } | null>(null);

  // ─── Zakup domeny przez Vercel ─────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    domain: string;
    available: boolean;
    price?: number;
    period?: number;
    currency?: string;
  } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  const verified = Boolean(project.custom_domain_verified_at);

  async function handleSearch() {
    setSearchError(null);
    setSearchResult(null);
    setBuyError(null);
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchError("Wpisz domenę do sprawdzenia.");
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/domains/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json().catch(() => ({}))) as {
        domain?: string;
        available?: boolean;
        price?: number;
        period?: number;
        currency?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setSearchError(data.message ?? data.error ?? "Nie udało się sprawdzić domeny.");
        return;
      }
      setSearchResult({
        domain: data.domain ?? q,
        available: Boolean(data.available),
        price: data.price,
        period: data.period,
        currency: data.currency,
      });
    } finally {
      setSearching(false);
    }
  }

  async function handleBuy() {
    if (!searchResult || !searchResult.available) return;
    setBuyError(null);
    setBuying(true);
    try {
      const res = await fetch("/api/domains/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: searchResult.domain,
          projectId: project.id,
          expectedPrice: searchResult.price,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        domain?: string;
        warning?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        setBuyError(data.message ?? data.error ?? "Zakup się nie udał.");
        return;
      }
      setDomain(data.domain ?? searchResult.domain);
      setSearchResult(null);
      setSearchQuery("");
      router.refresh();
    } finally {
      setBuying(false);
    }
  }

  async function handleVerify() {
    setError(null);
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch(
        `/api/projects/${project.id}/domain/verify`,
        { method: "POST" },
      );
      const data = (await res.json()) as {
        verified?: boolean;
        misconfigured?: boolean;
        expected?: { cnames?: string[]; aValues?: string[] };
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Weryfikacja nie powiodla sie");
        return;
      }
      setVerifyResult({
        verified: Boolean(data.verified),
        misconfigured: data.misconfigured,
        expectedCnames: data.expected?.cnames,
        expectedAValues: data.expected?.aValues,
      });
      if (data.verified) router.refresh();
    } finally {
      setVerifying(false);
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/domain`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Nie udalo sie zapisac domeny");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setRemoving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/domain`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Nie udalo sie usunac domeny");
        return;
      }
      setDomain("");
      router.refresh();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-beige/20 bg-card sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Domeny i hosting</DialogTitle>
          <DialogDescription>
            Zarzadzaj domenami dla tego projektu. Hosting podgladu jest
            aktywny pod {publishDomain}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="rounded-lg border border-beige/15 bg-background/60 p-3">
            <p className="text-sm font-medium text-foreground">
              Domena podgladu
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Generowany automatycznie adres - dziala od razu, bez konfiguracji.
            </p>
            {project.is_public && project.slug ? (
              <div className="mt-2 flex items-center gap-2">
                <Input
                  value={buildSubdomainUrl(project.slug, publishDomain)}
                  readOnly
                  className="font-mono text-xs"
                />
                <CopyButton
                  value={buildSubdomainUrl(project.slug, publishDomain)}
                />
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Opublikuj projekt, aby zobaczyc adres.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-beige/15 bg-background/60 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Wlasna domena
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Podpniesz np. twojasklep.pl. Skonfiguruj rekord DNS
                  zgodnie z instrukcja ponizej.
                </p>
              </div>
              {project.custom_domain && (
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                    verified
                      ? "border-emerald-400/30 text-emerald-300"
                      : "border-amber-400/30 text-amber-200"
                  }`}
                >
                  {verified ? "Zweryfikowano" : "Oczekuje"}
                </span>
              )}
            </div>

            <form onSubmit={handleSave} className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="np. twojasklep.pl"
                  className="font-mono text-xs"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={saving || !domain.trim()}
                className="bg-beige text-beige-foreground hover:bg-beige/90"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Zapisz
              </Button>
              {project.custom_domain && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleVerify}
                    disabled={verifying}
                    className="text-beige/90 hover:bg-white/5"
                  >
                    {verifying ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Sprawdź DNS
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleRemove}
                    disabled={removing}
                    className="text-red-300 hover:bg-red-500/10"
                  >
                    {removing && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Usun
                  </Button>
                </>
              )}
            </form>

            {error && (
              <p className="mt-2 text-xs text-red-300">{error}</p>
            )}

            {verifyResult && (
              <div
                className={`mt-3 rounded-md border p-3 text-xs ${
                  verifyResult.verified
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-100"
                }`}
              >
                {verifyResult.verified ? (
                  <p className="font-medium">
                    DNS poprawnie skonfigurowane. Domena działa.
                  </p>
                ) : (
                  <>
                    <p className="font-medium">
                      DNS jeszcze nie wskazuje na nasze serwery.
                    </p>
                    <p className="mt-1">
                      Konfiguracja może potrwać do 30 minut po dodaniu rekordu
                      CNAME. Sprawdź ponownie później.
                    </p>
                    {verifyResult.expectedCnames && verifyResult.expectedCnames.length > 0 && (
                      <p className="mt-2 font-mono text-[10px]">
                        CNAME → {verifyResult.expectedCnames.join(", ")}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="mt-3 rounded-md border border-beige/10 bg-card/40 p-3 text-xs text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">
                Konfiguracja DNS
              </p>
              <ol className="list-decimal space-y-1 pl-4">
                <li>
                  U swojego rejestratora dodaj rekord{" "}
                  <span className="font-mono text-beige/80">CNAME</span> dla
                  hosta{" "}
                  <span className="font-mono text-beige/80">@</span> lub{" "}
                  <span className="font-mono text-beige/80">www</span>{" "}
                  wskazujacy na{" "}
                  <span className="font-mono text-beige/80">
                    cname.vercel-dns.com
                  </span>
                  .
                </li>
                <li>
                  Po zapisaniu domeny powyzej napisz do nas (
                  <a
                    href="mailto:hello@wybitnastrona.pl"
                    className="text-beige/80 hover:text-beige"
                  >
                    hello@wybitnastrona.pl
                  </a>
                  ), abysmy podpieli ja do platformy. Weryfikacja zwykle
                  trwa do 30 minut.
                </li>
                <li>
                  Aktualnie dostepne sa rowniez subdomeny{" "}
                  <span className="font-mono text-beige/80">
                    *.{rootDomain}
                  </span>{" "}
                  oraz{" "}
                  <span className="font-mono text-beige/80">
                    *.{publishDomain}
                  </span>
                  .
                </li>
              </ol>
            </div>
          </section>

          <section className="rounded-lg border border-beige/15 bg-background/60 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Kup domenę przez wybitnastrona.pl
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Zakup w jednym kroku — domena zostanie automatycznie
                  podpięta do tego projektu, bez ręcznej konfiguracji DNS.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-violet-200">
                Nowość
              </span>
            </div>

            <div className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder="np. mojasklep.pl"
                  className="font-mono text-xs"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="border-beige/20 text-beige/90 hover:bg-white/5"
              >
                {searching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Globe className="h-3.5 w-3.5" />
                )}
                Sprawdź
              </Button>
            </div>

            {searchError && (
              <p className="mt-2 text-xs text-red-300">{searchError}</p>
            )}

            {searchResult && (
              <div
                className={`mt-3 rounded-md border p-3 text-xs ${
                  searchResult.available
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-100"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[13px] font-medium">
                      {searchResult.domain}
                    </p>
                    {searchResult.available ? (
                      <p className="mt-0.5 text-[11px] opacity-80">
                        Dostępna · {typeof searchResult.price === "number"
                          ? `$${searchResult.price.toFixed(2)} ${searchResult.currency ?? "USD"}`
                          : "cena nieznana"}
                        {searchResult.period
                          ? ` / ${searchResult.period} ${searchResult.period === 1 ? "rok" : "lata"}`
                          : ""}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[11px] opacity-80">
                        Niedostępna — spróbuj innej nazwy.
                      </p>
                    )}
                  </div>
                  {searchResult.available && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleBuy}
                      disabled={buying}
                      className="bg-violet-500 text-white hover:bg-violet-500/90"
                    >
                      {buying ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Kup i podepnij
                    </Button>
                  )}
                </div>
              </div>
            )}

            {buyError && (
              <p className="mt-2 text-xs text-red-300">{buyError}</p>
            )}

            <p className="mt-3 text-[10px] text-muted-foreground/70">
              Płatność jest realizowana przez Vercel Domains. Po zakupie
              domena jest natychmiast aktywna i podpięta do tego projektu.
            </p>
          </section>

          <section className="rounded-lg border border-dashed border-beige/15 bg-background/40 p-3">
            <p className="text-sm font-medium text-foreground">
              Mam już domenę u innego dostawcy
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Jeśli kupiłeś domenę gdzie indziej (home.pl / OVH / Cloudflare),
              wpisz ją w sekcji <span className="font-medium">"Własna domena"</span> powyżej
              i skonfiguruj DNS zgodnie z instrukcją.
            </p>
            <a
              href={domainPartnerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-beige/20 px-3 text-xs font-medium text-beige/90 transition hover:border-beige/40 hover:bg-white/5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Partner — alternatywne miejsce zakupu
            </a>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="outline"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label="Kopiuj"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

// ─── Native publish (iOS / Android / Watch / TV / Vision) ──────────────────────

function isNativeProject(
  mode: string | null | undefined,
): mode is "ios" | "android" | "watchos" | "tvos" | "visionos" {
  return (
    mode === "ios" ||
    mode === "android" ||
    mode === "watchos" ||
    mode === "tvos" ||
    mode === "visionos"
  );
}

function NativePublishDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: Project;
}) {
  const platform = (project.mode as
    | "ios"
    | "android"
    | "watchos"
    | "tvos"
    | "visionos");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publikacja projektu mobilnego</DialogTitle>
          <DialogDescription>
            Wyslij projekt do TestFlight / Google Play. Dane integracji
            (klucze ASC, keystore) sa zapisywane bezpiecznie w Twoim koncie.
          </DialogDescription>
        </DialogHeader>
        <ProjectPublishView projectId={project.id} platform={platform} />
      </DialogContent>
    </Dialog>
  );
}
