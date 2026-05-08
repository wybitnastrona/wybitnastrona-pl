import Link from "next/link";
import { redirect } from "next/navigation";
import { Globe, Plus, Sparkles } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { listMyProjects } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard - wybitnastrona.pl",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const projects = await listMyProjects();

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-medium tracking-tight">
                Twoje projekty
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Wszystkie strony, ktore wygenerowales w wybitnastrona.pl.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-beige px-4 text-sm font-medium text-beige-foreground transition hover:bg-beige/90"
            >
              <Plus className="h-4 w-4" />
              Nowy projekt
            </Link>
          </div>

          {projects.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/project/${project.id}`}
                  className="group flex flex-col gap-3 rounded-xl border border-beige/10 bg-card p-4 transition hover:border-beige/40 hover:bg-card/80"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="line-clamp-2 text-base font-medium text-foreground transition group-hover:text-beige">
                      {project.title}
                    </h2>
                    {project.is_public && project.slug && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-beige/20 bg-background px-2 py-0.5 text-[10px] uppercase tracking-wider text-beige/80">
                        <Globe className="h-3 w-3" />
                        Live
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {project.prompt}
                  </p>
                  <p className="mt-auto text-xs text-muted-foreground">
                    Aktualizacja:{" "}
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
      </main>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-beige/20 bg-card/40 px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-beige/30 bg-beige/10 text-beige">
        <Sparkles className="h-5 w-5" />
      </div>
      <h2 className="text-xl font-medium tracking-tight">
        Brak projektow - zacznij budowac
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Wpisz pomysl na stronie glownej, a AI wygeneruje pierwszy projekt w
        kilka sekund.
      </p>
      <Link
        href="/"
        className="inline-flex h-9 items-center justify-center rounded-lg bg-beige px-4 text-sm font-medium text-beige-foreground transition hover:bg-beige/90"
      >
        Stworz pierwszy projekt
      </Link>
    </div>
  );
}
