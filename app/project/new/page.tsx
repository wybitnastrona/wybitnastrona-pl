import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/lib/projects";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ prompt?: string | string[] }>;

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const params = await searchParams;
  const rawPrompt = Array.isArray(params.prompt)
    ? params.prompt[0]
    : params.prompt;
  const prompt = (rawPrompt ?? "").trim();
  if (!prompt) redirect("/");

  const project = await createProject(prompt);
  redirect(`/project/${project.id}`);
}
