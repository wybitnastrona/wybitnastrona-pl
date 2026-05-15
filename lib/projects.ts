import "server-only";
import { customAlphabet } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import type {
  Project,
  ProjectFiles,
  ProjectListItem,
} from "@/lib/types/project";
import { getTemplate, type TemplateId } from "@/lib/templates";
import { getModeById, DEFAULT_MODE, type ProjectMode } from "@/lib/project-modes";
import {
  stripShadowPublicIndexFromProjectFiles,
  ensureTailwindInProjectFiles,
} from "@/lib/sandpack/merge-preview-files";

const slugAlphabet =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const generateSlug = customAlphabet(slugAlphabet, 10);

/**
 * Eksport dla webhooka i klientow ktorzy potrzebuja swiezego auto-sluga
 * (np. po cancel subskrypcji — wracamy z customowego do auto).
 */
export function generateProjectAutoSlug(): string {
  return generateSlug();
}

/** Wykryj czy slug wyglada jak nasz auto-generated (10 znakow alfanum). */
export const AUTO_SLUG_REGEX = /^[A-Za-z0-9]{10}$/;
export function isAutoSlug(slug: string | null | undefined): boolean {
  return !!slug && AUTO_SLUG_REGEX.test(slug);
}

function deriveTitle(prompt: string): string {
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  if (cleaned.length === 0) return "Untitled project";
  const sliced = cleaned.slice(0, 60);
  return sliced.length < cleaned.length ? `${sliced}…` : sliced;
}

export async function createProject(
  prompt: string,
  templateId?: TemplateId,
  projectMode?: ProjectMode | string,
  customSystemContext?: string,
): Promise<Project> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const resolvedMode = (projectMode as ProjectMode) ?? DEFAULT_MODE;
  const modeDef = getModeById(resolvedMode);
  // Template from URL param takes priority; otherwise use mode's default.
  const resolvedTemplateId = templateId ?? (modeDef.defaultTemplate as TemplateId);
  const template = getTemplate(resolvedTemplateId);

  // Generujemy slug od razu — uzytkownik widzi pelny URL podgladu zaraz
  // po stworzeniu projektu (bez czekania na publish).
  const slug = generateSlug();

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      prompt,
      title: deriveTitle(prompt),
      files: template.getFiles(),
      template: template.id,
      mode: resolvedMode,
      custom_system_context: customSystemContext ?? null,
      slug,
    })
    .select("*")
    .single();

  if (error) {
    // PostgreSQL error 42703 = "column does not exist" — schema is behind migrations.
    // Fall back to minimal insert (without new columns) so the user can still create projects.
    if ((error as { code?: string }).code === "42703") {
      console.warn(
        "[createProject] Missing column — falling back to minimal insert. " +
          "Run the schema migration in Supabase Dashboard. Error:",
        error.message,
      );
      const { data: data2, error: error2 } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          prompt,
          title: deriveTitle(prompt),
          files: template.getFiles(),
          slug,
        })
        .select("*")
        .single();
      if (error2) throw error2;
      return data2 as Project;
    }
    throw error;
  }
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

  // Strict privacy: tylko projekty zalogowanego uzytkownika.
  // RLS na tabeli `projects` ma policy `public_read_published` ktora przepuscilaby
  // wszystkie publiczne projekty INNYCH uzytkownikow przy zwyklym select bez
  // .eq("user_id", ...). Bez filtra ponizej dashboard pokazywalby cudze projekty.
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, prompt, slug, is_public, mode, preview_html, created_at, updated_at")
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
    .select("id, title, prompt, slug, is_public, mode, created_at, updated_at")
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
  const cleaned = stripShadowPublicIndexFromProjectFiles(files);
  const { error } = await supabase
    .from("projects")
    .update({ files: ensureTailwindInProjectFiles(cleaned) })
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

/** Walidacja niestandardowej subdomeny (3-32 znaki, [a-z0-9-], nie zaczyna/konczy myslnikiem). */
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/;

export class PublishError extends Error {
  constructor(
    public readonly code:
      | "invalid_slug"
      | "slug_taken"
      | "not_found"
      | "requires_pro",
    message: string,
  ) {
    super(message);
  }
}

export function isValidPublishSlug(value: string): boolean {
  return SLUG_REGEX.test(value);
}

/**
 * Sprawdza dostepnosc subdomeny (dla live-checku w PublishDialog).
 * Zwraca true jezeli slug nie istnieje albo istnieje tylko dla excludeProjectId.
 */
export async function isSlugAvailable(
  slug: string,
  excludeProjectId?: string,
): Promise<boolean> {
  if (!isValidPublishSlug(slug)) return false;
  const supabase = await createClient();
  let query = supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("slug", slug);
  if (excludeProjectId) {
    query = query.neq("id", excludeProjectId);
  }
  const { count, error } = await query;
  if (error) return false;
  return (count ?? 0) === 0;
}

export async function publishProject(
  id: string,
  customSlug?: string | null,
): Promise<{ slug: string; isPublic: boolean }> {
  const supabase = await createClient();
  const existing = await getProject(id);
  if (!existing) throw new PublishError("not_found", "Project not found");

  let slug = existing.slug ?? generateSlug();

  const trimmed = customSlug?.trim().toLowerCase() ?? "";
  const isChangingToCustom = trimmed && trimmed !== existing.slug;

  // PRO gating dla CUSTOM subdomen. Auto-slug dostepny dla wszystkich.
  if (isChangingToCustom) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tier, stripe_subscription_status")
        .eq("id", user.id)
        .maybeSingle();

      const tier = profile?.tier as string | null;
      const status = profile?.stripe_subscription_status as string | null;
      const isProActive =
        tier === "pro" && (status === "active" || status === "trialing");

      // Jezeli nie jest PRO ALE customSlug nie jest naszym auto-slugiem,
      // zablokuj. (Auto-slug zawsze OK.)
      if (!isProActive && !isAutoSlug(trimmed)) {
        throw new PublishError(
          "requires_pro",
          "Niestandardowa subdomena wymaga aktywnej subskrypcji PRO.",
        );
      }
    }

    if (!isValidPublishSlug(trimmed)) {
      throw new PublishError(
        "invalid_slug",
        "Subdomena musi miec 3-32 znakow (a-z, 0-9, -); nie moze zaczynac/konczyc sie myslnikiem.",
      );
    }
    const { count, error: countError } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("slug", trimmed)
      .neq("id", id);
    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      throw new PublishError(
        "slug_taken",
        "Ta subdomena jest juz zajeta — wybierz inna.",
      );
    }
    slug = trimmed;
  }

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

/**
 * Wybitna Baza Danych — auto-provisioned Supabase per project.
 * Updates lifecycle columns on the projects row.
 */
export async function updateAppSupabase(
  id: string,
  patch: {
    project_id?: string | null;
    url?: string | null;
    anon_key?: string | null;
    status?: "none" | "provisioning" | "ready" | "error";
    provisioned_at?: string | null;
  },
): Promise<void> {
  const supabase = await createClient();
  const dbPatch: Record<string, string | null> = {};
  if (patch.project_id !== undefined)
    dbPatch.app_supabase_project_id = patch.project_id;
  if (patch.url !== undefined) dbPatch.app_supabase_url = patch.url;
  if (patch.anon_key !== undefined) dbPatch.app_supabase_anon_key = patch.anon_key;
  if (patch.status !== undefined) dbPatch.app_supabase_status = patch.status;
  if (patch.provisioned_at !== undefined)
    dbPatch.app_supabase_provisioned_at = patch.provisioned_at;
  const { error } = await supabase
    .from("projects")
    .update(dbPatch)
    .eq("id", id);
  if (error) throw error;
}

// ─── Snapshots ──────────────────────────────────────────────────────────────

export type Snapshot = {
  id: string;
  project_id: string;
  files: ProjectFiles;
  label: string | null;
  message_id: string | null;
  created_at: string;
};

export async function createSnapshot(
  projectId: string,
  files: ProjectFiles,
  label?: string,
  messageId?: string,
): Promise<Snapshot> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_snapshots")
    .insert({
      project_id: projectId,
      files,
      label: label ?? null,
      message_id: messageId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Snapshot;
}

export async function listSnapshots(projectId: string): Promise<Snapshot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_snapshots")
    .select("id, project_id, label, message_id, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(50);
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
    .from("project_chat_messages")
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
  const { error } = await supabase.from("project_chat_messages").insert(rows);
  if (error) throw error;
}

export async function replaceChatMessages(
  projectId: string,
  msgs: Array<{ role: "user" | "assistant" | "system"; parts: unknown[] }>,
): Promise<void> {
  const supabase = await createClient();
  // delete + insert w jednej transakcji nie da rady przez supabase-js,
  // ale project_chat_messages ma cascadę i RLS, wiec robimy 2 osobne ops.
  await supabase.from("project_chat_messages").delete().eq("project_id", projectId);
  if (msgs.length === 0) return;
  const rows = msgs.map((m) => ({
    project_id: projectId,
    role: m.role,
    parts: m.parts,
  }));
  await supabase.from("project_chat_messages").insert(rows);
}
