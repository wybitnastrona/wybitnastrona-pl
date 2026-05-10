import Link from "next/link";
import { ArrowRight, FolderOpen, Globe } from "lucide-react";
import type { ProjectListItem } from "@/lib/types/project";

type RecentlyEditedProps = {
  projects: ProjectListItem[];
};

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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.slice(0, 6).map((project) => (
            <Link
              key={project.id}
              href={`/project/${project.id}`}
              className="group flex flex-col gap-2 rounded-xl border border-beige/10 bg-card p-4 transition hover:border-beige/40 hover:bg-card/80"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-1 text-sm font-medium text-foreground transition group-hover:text-beige">
                  {project.title}
                </h3>
                {project.is_public && project.slug && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-beige/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-beige/80">
                    <Globe className="h-2.5 w-2.5" />
                    Live
                  </span>
                )}
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {project.prompt}
              </p>
              <p className="mt-auto text-[11px] text-muted-foreground">
                {new Date(project.updated_at).toLocaleDateString("pl-PL", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </Link>
          ))}
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
