-- Lock files: paths in this array are protected from AI writes/patches/deletes.
-- AI is informed about them via the system prompt and the tool guards reject
-- mutations if the path is locked.

alter table public.projects
  add column if not exists locked_files text[] not null default '{}';
