-- Wybitna Baza Danych — shared Supabase instance per platform (not per project).
--
-- Instead of auto-provisioning a dedicated Supabase project for each generated
-- app (expensive, slow), every project shares one Supabase instance. Data is
-- isolated via a `project_id` column + RLS policies on the shared DB.
--
-- This migration only tracks whether the user has "activated" the shared DB
-- for their project (opt-in: the AI starts generating DB code once enabled).

alter table projects
  -- Drop old per-project provisioning columns if they exist (prev implementation).
  drop column if exists app_supabase_project_id,
  drop column if exists app_supabase_url,
  drop column if exists app_supabase_anon_key,
  drop column if exists app_supabase_status,
  drop column if exists app_supabase_provisioned_at,
  -- New: simple boolean flag — true once user activates shared DB for this project.
  add column if not exists app_db_enabled boolean not null default false;

drop index if exists projects_app_supabase_status_idx;

create index if not exists projects_app_db_enabled_idx
  on projects (id)
  where app_db_enabled = true;

comment on column projects.app_db_enabled is
  'Wybitna Baza Danych: true when user has activated the shared app database for this project. The AI will start generating Supabase code referencing the shared instance.';
