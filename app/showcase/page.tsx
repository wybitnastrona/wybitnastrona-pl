import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { listPublicProjects } from "@/lib/projects";
import { RemixButton } from "@/components/showcase/remix-button";

export const revalidate = 60;

export const metadata = {
  title: "Showcase - wybitnastrona.pl",
  description:
    "Galeria stron stworzonych przez społeczność wybitnastrona.pl. Remixuj projekty jednym kliknięciem.",
};

const PUBLISH_DOMAIN =
  process.env.NEXT_PUBLIC_PUBLISH_DOMAIN ?? "wybitny.website";

export default async function ShowcasePage() {
  const projects = await listPublicProjects(48);

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-12 text-center">
            <span className="inline-flex items-center gap-1 rounded-full border border-beige/20 bg-card/60 px-3 py-1 text-xs uppercase tracking-wider text-beige/80">
              <Sparkles className="h-3 w-3" />
              Showcase
            </span>
            <h1 className="mt-4 text-balance text-4xl font-medium tracking-tight sm:text-5xl">
              Co tworzy społeczność
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground">
              Najlepsze publiczne projekty użytkowników. Kliknij Remix, żeby
              zacząć od czyjegoś pomysłu i go rozwinąć.
            </p>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-xl border border-beige/10 bg-card/40 p-10 text-center text-sm text-muted-foreground">
              Nikt jeszcze nie opublikował projektu. Bądź pierwszy.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => {
                const previewUrl = p.slug
                  ? `https://${p.slug}.${PUBLISH_DOMAIN}`
                  : null;
                return (
                  <article
                    key={p.id}
                    className="group flex flex-col gap-3 overflow-hidden rounded-xl border border-beige/10 bg-card/40 transition hover:border-beige/30 hover:bg-card"
                  >
                    {previewUrl ? (
                      <Link
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative block aspect-[16/10] overflow-hidden border-b border-beige/10 bg-background/60"
                      >
                        <iframe
                          src={previewUrl}
                          loading="lazy"
                          title={p.title}
                          className="pointer-events-none h-full w-full origin-top-left scale-[0.5] [&]:w-[200%] [&]:h-[200%]"
                          sandbox="allow-scripts allow-same-origin"
                        />
                      </Link>
                    ) : (
                      <div className="aspect-[16/10] border-b border-beige/10 bg-gradient-to-br from-beige/10 to-background" />
                    )}
                    <div className="flex flex-col gap-2 px-4 pb-4">
                      <h3 className="line-clamp-1 text-sm font-medium">
                        {p.title}
                      </h3>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {p.prompt}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        {previewUrl ? (
                          <Link
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-beige hover:text-beige/80"
                          >
                            Zobacz <ArrowRight className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span />
                        )}
                        <RemixButton projectId={p.id} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
