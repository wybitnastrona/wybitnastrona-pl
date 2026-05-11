import Link from "next/link";
import { ArrowRight, FolderOpen, Globe, Lock } from "lucide-react";
import { AppleIcon, AndroidIcon } from "@/components/brand-icons";
import type { ProjectListItem } from "@/lib/types/project";

type RecentlyEditedProps = {
  projects: ProjectListItem[];
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "przed chwila";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min temu`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} h temu`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD} dni temu`;
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function platformIcon(
  mode: string | null | undefined,
): { Icon: React.ComponentType<{ className?: string }>; label: string } {
  switch (mode) {
    case "ios":
      return { Icon: AppleIcon, label: "iOS" };
    case "android":
      return { Icon: AndroidIcon, label: "Android" };
    case "watchos":
      return { Icon: AppleIcon, label: "Watch" };
    case "tvos":
      return { Icon: AppleIcon, label: "TV" };
    case "visionos":
      return { Icon: AppleIcon, label: "Vision" };
    default:
      return { Icon: Globe, label: "Web" };
  }
}

export function RecentlyEdited({ projects }: RecentlyEditedProps) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="text-lg font-medium text-foreground">
          Ostatnio edytowane
        </h2>
        {projects.length > 0 && (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs text-beige/80 transition hover:text-beige"
          >
            Zobacz wszystkie
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.slice(0, 6).map((project) => {
            const { Icon: PlatformIcon, label: platformLabel } = platformIcon(
              project.mode,
            );
            return (
              <Link
                key={project.id}
                href={`/project/${project.id}`}
                className="group flex flex-col gap-3 overflow-hidden rounded-2xl border border-beige/10 bg-card transition hover:border-beige/40 hover:bg-card/80"
              >
                {/* Thumbnail strip — stylized "device" silhouette with platform accent */}
                <div className="relative flex h-32 items-center justify-center overflow-hidden border-b border-beige/10 bg-gradient-to-br from-beige/5 via-background to-background">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(232,220,196,0.08),transparent_60%)]" />
                  <div className="relative flex h-20 w-12 items-center justify-center rounded-[10px] border-[2px] border-beige/30 bg-background/80 shadow-inner">
                    <PlatformIcon className="h-6 w-6 text-beige/70" />
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-2 px-4 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 text-sm font-medium text-foreground transition group-hover:text-beige">
                      {project.title}
                    </h3>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-beige/15 bg-background/50 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-beige/70">
                      <PlatformIcon className="h-2.5 w-2.5" />
                      {platformLabel}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {project.prompt}
                  </p>
                  <div className="mt-auto flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Edytowano {formatRelativeTime(project.updated_at)}</span>
                    <span className="inline-flex items-center gap-1">
                      {project.is_public ? (
                        <>
                          <Globe className="h-2.5 w-2.5" />
                          Publiczny
                        </>
                      ) : (
                        <>
                          <Lock className="h-2.5 w-2.5" />
                          Prywatny
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-beige/20 bg-card/40 px-6 py-12 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-beige/20 bg-beige/10 text-beige">
        <FolderOpen className="h-4 w-4" />
      </span>
      <p className="text-sm font-medium text-foreground">
        Nie znaleziono projektow
      </p>
      <p className="max-w-md text-xs text-muted-foreground">
        Wpisz pomysl powyzej, a AI wygeneruje pierwszy projekt w kilka sekund.
      </p>
    </div>
  );
}
