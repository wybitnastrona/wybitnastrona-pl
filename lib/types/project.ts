export type ProjectFile = {
  code: string;
  hidden?: boolean;
  active?: boolean;
};

export type ProjectFiles = Record<string, ProjectFile>;

export type Project = {
  id: string;
  user_id: string;
  slug: string | null;
  title: string;
  prompt: string;
  files: ProjectFiles;
  is_public: boolean;
  published_at: string | null;
  custom_domain: string | null;
  custom_domain_verified_at: string | null;
  database_url: string | null;
  database_anon_key: string | null;
  template: string;
  /** Project mode: ios | android | web (platforma docelowa). */
  mode?: string | null;
  /** Custom user instructions appended to system prompt on every generation. */
  custom_system_context?: string | null;
  /** Paths that AI is forbidden to write/patch/delete. */
  locked_files: string[];
  created_at: string;
  updated_at: string;
};

export type ProjectListItem = Pick<
  Project,
  | "id"
  | "title"
  | "prompt"
  | "slug"
  | "is_public"
  | "mode"
  | "created_at"
  | "updated_at"
>;
