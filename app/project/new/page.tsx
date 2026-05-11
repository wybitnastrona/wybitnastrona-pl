import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/lib/projects";
import type { TemplateId } from "@/lib/templates";
import type { Project } from "@/lib/types/project";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  prompt?: string | string[];
  template?: string | string[];
  model?: string | string[];
  mode?: string | string[];
  projectMode?: string | string[];
  public?: string | string[];
  ctx?: string | string[];
  wybitny?: string | string[];
}>;

function pickParam(
  v: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?error=not-authenticated");

  const params = await searchParams;

  const prompt = (pickParam(params.prompt) ?? "").trim();
  if (!prompt) redirect("/?error=empty-prompt");

  const rawTemplate = pickParam(params.template);
  const rawModel = pickParam(params.model);
  const rawMode = pickParam(params.mode);
  const rawProjectMode = pickParam(params.projectMode);
  const isPublic = pickParam(params.public) === "1";
  const isWybitny = pickParam(params.wybitny) === "1";
  const rawCtx = pickParam(params.ctx);
  const customSystemContext =
    (rawCtx ?? "").trim().slice(0, 2000) || undefined;

  // Sanity check: upewnij sie ze profil istnieje. Bez wpisu w `profiles` RLS-y
  // dla `finish_job` zawioda, a uzytkownik nie zobaczy zadnego feedbacku.
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
    },
    { onConflict: "id", ignoreDuplicates: false },
  );

  let project: Project;
  try {
    project = await createProject(
      prompt,
      rawTemplate as TemplateId | undefined,
      rawProjectMode,
      customSystemContext,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "unknown-error";
    console.error("[new-project] createProject failed:", err);
    redirect(`/?error=create-project&detail=${encodeURIComponent(message)}`);
  }

  // Apply optional flags. Bledy na update'ach NIE blokuja przekierowania —
  // projekt juz istnieje, user ma do niego dostep.
  if (isPublic) {
    await supabase
      .from("projects")
      .update({ is_public: true })
      .eq("id", project.id);
  }
  if (isWybitny) {
    await supabase
      .from("projects")
      .update({ is_wybitny: true })
      .eq("id", project.id);
  }

  // Pass model and mode to the project page so ChatPanel can pick the right model.
  const projectParams = new URLSearchParams();
  if (rawModel) projectParams.set("model", rawModel);
  if (rawMode) projectParams.set("mode", rawMode);
  const qs = projectParams.toString();
  redirect(`/project/${project.id}${qs ? `?${qs}` : ""}`);
}
