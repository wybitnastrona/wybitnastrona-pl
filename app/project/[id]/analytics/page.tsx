import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects";
import { AnalyticsDashboard } from "@/components/project/analytics-dashboard";

type Params = Promise<{ id: string }>;

export const metadata = {
  title: "Analityka projektu",
};

export default async function ProjectAnalyticsPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const project = await getProject(id);
  if (!project || project.user_id !== user.id) redirect("/");

  const { data: stats } = await supabase.rpc("get_project_stats", {
    p_project_id: id,
    p_days: 30,
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <a
        href={`/project/${id}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Wróć do projektu
      </a>
      <h1 className="mb-2 text-2xl font-medium">{project.title}</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Analityka aktywności projektu — ostatnie 30 dni.
      </p>

      <AnalyticsDashboard
        events={
          (stats as Array<{ event_type: string; count: number; day: string }>) ?? []
        }
      />
    </main>
  );
}
