import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
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
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
                Twoje projekty
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Wszystkie strony, które wygenerowałeś w wybitnastrona.pl.
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

          <DashboardGrid projects={projects} />
        </section>
      </main>
    </>
  );
}
