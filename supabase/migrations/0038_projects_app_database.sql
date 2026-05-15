-- Wybitna Baza Danych — auto-provisioned Supabase project per generated app.
--
-- Each project on wybitnastrona.pl can have its own dedicated Supabase
-- database (provisioned through Supabase Management API). We store the
-- public credentials directly on the `projects` row so that:
--   1. The generated app code can inject them at build-time.
--   2. The platform UI ("Wybitna Baza Danych" panel) can show status / link.
--
-- Status lifecycle: none → provisioning → ready (or error).

alter table projects
  add column if not exists app_supabase_project_id text,
  add column if not exists app_supabase_url text,
  add column if not exists app_supabase_anon_key text,
  add column if not exists app_supabase_status text not null default 'none',
  add column if not exists app_supabase_provisioned_at timestamptz;

create index if not exists projects_app_supabase_status_idx
  on projects (app_supabase_status)
  where app_supabase_status <> 'none';

comment on column projects.app_supabase_status is
  'Wybitna Baza Danych status: none | provisioning | ready | error.';
comment on column projects.app_supabase_url is
  'Public Supabase URL of the per-project database (https://<ref>.supabase.co).';
comment on column projects.app_supabase_anon_key is
  'Public anon key for the per-project database. Safe to ship to the client.';
