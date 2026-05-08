import { notFound, redirect } from "next/navigation";
import { ProjectWorkspace } from "@/components/project/project-workspace";
import { getProject } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function ProjectPage({ params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const project = await getProject(id);
  if (!project || project.user_id !== user.id) {
    notFound();
  }

  const rootDomain =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <ProjectWorkspace
      project={project}
      rootDomain={rootDomain}
      appUrl={appUrl}
    />
  );
}
