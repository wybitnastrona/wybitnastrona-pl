"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Globe,
  Loader2,
  Share2,
} from "lucide-react";
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
import type { Project } from "@/lib/types/project";

type Props = {
  project: Project;
  rootDomain: string;
  appUrl: string;
};

export function ProjectTopbar({ project, rootDomain, appUrl }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(project.title);
  const [savingTitle, setSavingTitle] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  async function saveTitle() {
    if (title.trim() === project.title || !title.trim()) {
      setTitle(project.title);
      return;
    }
    setSavingTitle(true);
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      router.refresh();
    } finally {
      setSavingTitle(false);
    }
  }

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-beige/10 bg-background/80 px-4 backdrop-blur">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/dashboard"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-white/5 hover:text-beige"
          aria-label="Wroc do dashboardu"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground focus:outline-none"
          maxLength={120}
        />
        {savingTitle && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
        {project.is_public && project.slug && (
          <Link
            href={`/p/${project.slug}`}
            target="_blank"
            className="hidden md:inline-flex h-6 items-center gap-1 rounded-full border border-beige/20 px-2 text-xs text-beige/80 hover:border-beige/40 transition"
          >
            <Globe className="h-3 w-3" />
            Opublikowany
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShareOpen(true)}
          className="text-foreground/80 hover:bg-white/5"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Share</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            window.open(
              `/api/projects/${project.id}/export`,
              "_blank",
            );
          }}
          className="text-foreground/80 hover:bg-white/5"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => setPublishOpen(true)}
          className="bg-beige text-beige-foreground hover:bg-beige/90"
        >
          <Globe className="h-3.5 w-3.5" />
          {project.is_public ? "Zarzadzaj" : "Publish"}
        </Button>
      </div>

      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        project={project}
        rootDomain={rootDomain}
      />

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        project={project}
        appUrl={appUrl}
        rootDomain={rootDomain}
      />
    </header>
  );
}

function PublishDialog({
  open,
  onOpenChange,
  project,
  rootDomain,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  rootDomain: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [slug, setSlug] = useState(project.slug ?? "");
  const [isPublic, setIsPublic] = useState(project.is_public);

  async function handlePublish() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/publish`, {
        method: "POST",
      });
      if (res.ok) {
        const data = (await res.json()) as { slug: string };
        setSlug(data.slug);
        setIsPublic(true);
        router.refresh();
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
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  const subdomainUrl = slug
    ? rootDomain.includes("localhost")
      ? `http://${slug}.${rootDomain}`
      : `https://${slug}.${rootDomain}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-beige/20 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Publikacja na subdomenie</DialogTitle>
          <DialogDescription>
            Po publikacji projekt bedzie dostepny pod adresem{" "}
            <span className="font-mono text-beige/80">{`<slug>.${rootDomain}`}</span>
            .
          </DialogDescription>
        </DialogHeader>

        {isPublic && slug ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input value={subdomainUrl} readOnly className="font-mono text-xs" />
              <CopyButton value={subdomainUrl} />
            </div>
            <p className="text-xs text-muted-foreground">
              Strona jest publicznie widoczna. Mozesz ja w kazdej chwili
              wycofac.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Klikniecie ponizej wygeneruje unikalny slug i opublikuje projekt.
          </p>
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
              disabled={loading}
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

function ShareDialog({
  open,
  onOpenChange,
  project,
  appUrl,
  rootDomain,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  appUrl: string;
  rootDomain: string;
}) {
  const shareUrl = project.is_public && project.slug
    ? `${appUrl}/p/${project.slug}`
    : "";

  const subdomainUrl = project.is_public && project.slug
    ? rootDomain.includes("localhost")
      ? `http://${project.slug}.${rootDomain}`
      : `https://${project.slug}.${rootDomain}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-beige/20 sm:max-w-[480px]">
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
                Subdomena
              </p>
              <div className="flex items-center gap-2">
                <Input value={subdomainUrl} readOnly className="font-mono text-xs" />
                <CopyButton value={subdomainUrl} />
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                Strona z opisem (z navbarem)
              </p>
              <div className="flex items-center gap-2">
                <Input value={shareUrl} readOnly className="font-mono text-xs" />
                <CopyButton value={shareUrl} />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Otworz dialog Publish, zeby udostepnic projekt publicznie.
          </p>
        )}
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
