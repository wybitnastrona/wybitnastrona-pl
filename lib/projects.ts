import "server-only";
import { customAlphabet } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import type {
  Project,
  ProjectFiles,
  ProjectListItem,
} from "@/lib/types/project";
import { getTemplate, type TemplateId } from "@/lib/templates";

const slugAlphabet =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const generateSlug = customAlphabet(slugAlphabet, 10);

function deriveTitle(prompt: string): string {
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  if (cleaned.length === 0) return "Untitled project";
  const sliced = cleaned.slice(0, 60);
  return sliced.length < cleaned.length ? `${sliced}…` : sliced;
}

export async function createProject(
  prompt: string,
  templateId?: TemplateId,
): Promise<Project> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const template = getTemplate(templateId);

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      prompt,
      title: deriveTitle(prompt),
      files: template.getFiles(),
      template: template.id,
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

export async function updateProjectCustomDomain(
  id: string,
  domain: string | null,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      custom_domain: domain,
      custom_domain_verified_at: null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function updateProjectDatabase(
  id: string,
  database: { url: string | null; anonKey: string | null },
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      database_url: database.url,
      database_anon_key: database.anonKey,
    })
    .eq("id", id);
  if (error) throw error;
}

// ─── Snapshots ──────────────────────────────────────────────────────────────

export type Snapshot = {
  id: string;
  project_id: string;
  files: ProjectFiles;
  label: string | null;
  created_at: string;
};

export async function createSnapshot(
  projectId: string,
  files: ProjectFiles,
  label?: string,
): Promise<Snapshot> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_snapshots")
    .insert({ project_id: projectId, files, label: label ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return data as Snapshot;
}

export async function listSnapshots(projectId: string): Promise<Snapshot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_snapshots")
    .select("id, project_id, label, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return (data ?? []) as Snapshot[];
}

export async function getSnapshot(id: string): Promise<Snapshot | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_snapshots")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Snapshot;
}

// ─── Chat messages ──────────────────────────────────────────────────────────

export type StoredChatMessage = {
  id: string;
  project_id: string;
  role: "user" | "assistant" | "system";
  parts: unknown[];
  created_at: string;
};

export async function listChatMessages(
  projectId: string,
): Promise<StoredChatMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as StoredChatMessage[];
}

export async function appendChatMessages(
  projectId: string,
  msgs: Array<{ role: "user" | "assistant" | "system"; parts: unknown[] }>,
): Promise<void> {
  if (msgs.length === 0) return;
  const supabase = await createClient();
  const rows = msgs.map((m) => ({
    project_id: projectId,
    role: m.role,
    parts: m.parts,
  }));
  const { error } = await supabase.from("chat_messages").insert(rows);
  if (error) throw error;
}

export async function replaceChatMessages(
  projectId: string,
  msgs: Array<{ role: "user" | "assistant" | "system"; parts: unknown[] }>,
): Promise<void> {
  const supabase = await createClient();
  // delete + insert w jednej transakcji nie da rady przez supabase-js,
  // ale chat_messages ma cascadę i RLS, wiec robimy 2 osobne ops.
  await supabase.from("chat_messages").delete().eq("project_id", projectId);
  if (msgs.length === 0) return;
  const rows = msgs.map((m) => ({
    project_id: projectId,
    role: m.role,
    parts: m.parts,
  }));
  await supabase.from("chat_messages").insert(rows);
}
