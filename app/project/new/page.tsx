import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/lib/projects";
import type { TemplateId } from "@/lib/templates";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  prompt?: string | string[];
  template?: string | string[];
  model?: string | string[];
  mode?: string | string[];
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

  const rawModel = Array.isArray(params.model)
    ? params.model[0]
    : params.model;

  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;

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

  // Pass model and mode to the project page so ChatPanel can pick the right model.
  const projectParams = new URLSearchParams();
  if (rawModel) projectParams.set("model", rawModel);
  if (rawMode) projectParams.set("mode", rawMode);
  const qs = projectParams.toString();
  redirect(`/project/${project.id}${qs ? `?${qs}` : ""}`);
}
