import { notFound } from "next/navigation";
import { ExternalLink, Sparkles } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { SandpackRunner } from "@/components/sandpack/sandpack-runner";
import { RemixButton } from "@/components/showcase/remix-button";
import { getProjectBySlug } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import { logProjectEvent } from "@/lib/analytics-server";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Nie znaleziono" };
  return {
    title: `${project.title} - wybitnastrona.pl`,
    description: project.prompt.slice(0, 160),
  };
}

export default async function PublicSharePage({ params }: { params: Params }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  // Faza 2.7: trackuj odwiedziny strony publicznej.
  const supabase = await createClient();
  void logProjectEvent(supabase, {
    projectId: project.id,
    type: "view",
    metadata: { source: "public_slug_page" },
  });

  // Item 96: VERCEL_URL fallback przed localhost.
  const rootDomain =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ??
    process.env.VERCEL_URL ??
    "localhost:3000";
  const subdomainUrl = rootDomain.includes("localhost")
    ? `http://${slug}.${rootDomain}`
    : `https://${slug}.${rootDomain}`;

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full border border-beige/20 bg-card/60 px-3 py-1 text-xs uppercase tracking-wider text-beige/80">
                <Sparkles className="h-3 w-3" />
                Stworzone w wybitnastrona.pl
              </span>
              <h1 className="mt-3 truncate text-balance text-3xl font-medium tracking-tight sm:text-4xl">
                {project.title}
              </h1>
              <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                {project.prompt}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <a
                href={subdomainUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-beige/20 px-3 text-sm text-foreground/80 transition hover:border-beige/40 hover:text-beige"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Otwórz live
              </a>
              <RemixButton projectId={project.id} />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-beige/15 bg-card">
            <div className="h-[80vh] w-full">
              <SandpackRunner
                files={project.files}
                viewMode="preview"
                hideInternalNavigator
              />
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Opublikowano:{" "}
            {project.published_at
              ? new Date(project.published_at).toLocaleDateString("pl-PL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "-"}
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
