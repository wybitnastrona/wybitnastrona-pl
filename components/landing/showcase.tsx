import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { listPublicProjects } from "@/lib/projects";

const PLACEHOLDERS = [
  {
    title: "Dashboard dla trenera",
    description: "Lista klientow, harmonogram treningow, statystyki postepow.",
    color: "from-amber-200/20 to-amber-100/5",
  },
  {
    title: "Landing kawiarni",
    description: "Menu, galeria, formularz rezerwacji stolika.",
    color: "from-orange-200/20 to-amber-100/5",
  },
  {
    title: "Sklep z butami",
    description: "Katalog produktow, filtry, koszyk i checkout.",
    color: "from-rose-200/15 to-amber-100/5",
  },
  {
    title: "Portfolio freelancera",
    description: "Case studies, testimoniale i formularz kontaktowy.",
    color: "from-emerald-200/15 to-amber-100/5",
  },
  {
    title: "Aplikacja SaaS",
    description: "Pricing, FAQ, integracja z Stripe (placeholder).",
    color: "from-sky-200/15 to-amber-100/5",
  },
  {
    title: "Blog programisty",
    description: "Lista wpisow, znaczniki, dark mode toggle.",
    color: "from-violet-200/15 to-amber-100/5",
  },
];

export async function Showcase() {
  const publicProjects = await listPublicProjects(6);

  return (
    <section
      id="showcase"
      className="border-t border-beige/10 bg-background py-16 sm:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="inline-block rounded-full border border-beige/20 bg-card/60 px-3 py-1 text-xs uppercase tracking-wider text-beige/80">
              Showcase
            </span>
            <h2 className="mt-4 text-balance text-3xl font-medium tracking-tight sm:text-4xl">
              Strony zbudowane przez spolecznosc
            </h2>
            <p className="mt-3 text-muted-foreground">
              Inspiracje, ktore powstaly w wybitnastrona.pl. Kliknij, aby
              zobaczyc na zywo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {publicProjects.length > 0
            ? publicProjects.map((project) => (
                <Link
                  key={project.id}
                  href={project.slug ? `/p/${project.slug}` : "#"}
                  className="group flex flex-col gap-3 rounded-xl border border-beige/10 bg-card p-5 transition hover:border-beige/40"
                >
                  <div
                    className={`aspect-[16/10] rounded-lg bg-gradient-to-br ${PLACEHOLDERS[0].color} border border-beige/10`}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-foreground transition group-hover:text-beige">
                      {project.title}
                    </h3>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-beige" />
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {project.prompt}
                  </p>
                </Link>
              ))
            : PLACEHOLDERS.map((demo) => (
                <div
                  key={demo.title}
                  className="group flex flex-col gap-3 rounded-xl border border-beige/10 bg-card p-5 transition hover:border-beige/40"
                >
                  <div
                    className={`aspect-[16/10] rounded-lg bg-gradient-to-br ${demo.color} border border-beige/10`}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-foreground transition group-hover:text-beige">
                      {demo.title}
                    </h3>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-beige" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {demo.description}
                  </p>
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
