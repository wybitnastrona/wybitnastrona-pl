import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects";
import { VariantsClient } from "@/components/project/variants-client";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function VariantsPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const project = await getProject(id);
  if (!project || project.user_id !== user.id) redirect("/dashboard");

  return <VariantsClient projectId={id} prompt={project.prompt} />;
}
