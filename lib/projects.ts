import "server-only";
import { customAlphabet } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import type {
  Project,
  ProjectFiles,
  ProjectListItem,
} from "@/lib/types/project";
import { getStarterFiles } from "@/lib/sandpack/starter";

const slugAlphabet =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const generateSlug = customAlphabet(slugAlphabet, 10);

function deriveTitle(prompt: string): string {
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  if (cleaned.length === 0) return "Untitled project";
  const sliced = cleaned.slice(0, 60);
  return sliced.length < cleaned.length ? `${sliced}…` : sliced;
}

export async function createProject(prompt: string): Promise<Project> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      prompt,
      title: deriveTitle(prompt),
      files: getStarterFiles(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Project;
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return null;
  return data as Project | null;
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (error) return null;
  return data as Project | null;
}

export async function listMyProjects(): Promise<ProjectListItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("projects")
    .select("id, title, prompt, slug, is_public, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as ProjectListItem[];
}

export async function listPublicProjects(
  limit = 24,
): Promise<ProjectListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, prompt, slug, is_public, created_at, updated_at")
    .eq("is_public", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as ProjectListItem[];
}

export async function updateProjectFiles(
  id: string,
  files: ProjectFiles,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ files })
    .eq("id", id);
  if (error) throw error;
}

export async function updateProjectTitle(
  id: string,
  title: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ title })
    .eq("id", id);
  if (error) throw error;
}

export async function publishProject(
  id: string,
): Promise<{ slug: string; isPublic: boolean }> {
  const supabase = await createClient();
  const existing = await getProject(id);
  if (!existing) throw new Error("Project not found");

  const slug = existing.slug ?? generateSlug();

  const { error } = await supabase
    .from("projects")
    .update({
      slug,
      is_public: true,
      published_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
  return { slug, isPublic: true };
}

export async function unpublishProject(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ is_public: false, published_at: null })
    .eq("id", id);
  if (error) throw error;
}
