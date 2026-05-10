import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/lib/projects";
import type { TemplateId } from "@/lib/templates";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  prompt?: string | string[];
  template?: string | string[];
}>;

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

  const rawTemplate = Array.isArray(params.template)
    ? params.template[0]
    : params.template;

  let project;
  try {
    project = await createProject(
      prompt,
      rawTemplate as TemplateId | undefined,
    );
  } catch (err) {
    console.error("[new-project] createProject failed:", err);
    redirect("/");
  }
  redirect(`/project/${project.id}`);
}
