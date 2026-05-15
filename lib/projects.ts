import "server-only";
import { customAlphabet } from "nanoid";
import { createClient as createServiceClient } from "@supabase/supabase-js";
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
  sanitizeProjectPackageJson,
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
      app_db_enabled: true,
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

/**
 * Resolve projekt po sluga dla publicznego dostepu (subdomena {slug}.wybitny.website).
 *
 * Uzywa service role keya zeby ominac RLS — strony pod subdomenami sa
 * obslugiwane przez anonimowe zadanie z proxy.ts i RLS-owy `auth.uid()` jest
 * NULL. Bez service roli zwracaloby to 404 nawet dla `is_public=true`.
 *
 * Fallback: jesli service key nie jest skonfigurowany, uzywamy cookie clienta —
 * wymaga to publicznej policy na `projects` (read where is_public).
 */
/**
 * Sprawdza czy wlasciciel projektu (po `user_id`) ma aktywna subskrypcje PRO.
 * Uzywane do gating-u badge'a "Stworzone na wybitnastrona.pl" na publikowanych
 * stronach — FREE plan ma badge, PRO nie. Wykorzystuje service role zeby
 * zapytanie dzialalo bez sesji.
 */
export async function isProjectOwnerPro(userId: string): Promise<boolean> {
  if (!userId) return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Jezeli srodowisko nie jest skonfigurowane — nie blokuj renderowania
  // opublikowanej strony. Zwracamy false (badge "Made with" bedzie widoczny).
  if (!url || !serviceKey) return false;
  const admin = createServiceClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  try {
    const { data } = await admin
      .from("profiles")
      .select("tier, stripe_subscription_status")
      .eq("id", userId)
      .maybeSingle();
    if (!data) return false;
    const tier = (data as { tier?: string }).tier;
    const status = (data as { stripe_subscription_status?: string })
      .stripe_subscription_status;
    return tier === "pro" && (status === "active" || status === "trialing");
  } catch {
    // Brak kolumny (migracja 0043 jeszcze nie uruchomiona) lub inny blad DB —
    // nie blokujemy renderowania opublikowanej strony. Fallback = FREE (z badge).
    return false;
  }
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && serviceKey) {
    const admin = createServiceClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin
      .from("projects")
      .select("*")
      .eq("slug", slug)
      .eq("is_public", true)
      .maybeSingle();
    if (error) return null;
    return data as Project | null;
  }

  // Fallback (dev) — wymaga publicznej policy RLS.
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
    .select(
      "id, title, prompt, slug, is_public, mode, preview_html, preview_image_url, created_at, updated_at",
    )
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
  const withTailwind = ensureTailwindInProjectFiles(cleaned);
  // Napraw package.json jezeli AI wygenerowalo JSON z trailing commas lub
  // komentarzami — bez tego Sandpack i npm crashuja przy parsowaniu.
  const safe = sanitizeProjectPackageJson(withTailwind);
  const { error } = await supabase
    .from("projects")
    .update({ files: safe })
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
 * Wybitna Baza Danych — shared instance, per-project opt-in.
 * Toggles the app_db_enabled flag on the projects row.
 */
export async function setProjectDbEnabled(
  id: string,
  enabled: boolean,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ app_db_enabled: enabled })
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
