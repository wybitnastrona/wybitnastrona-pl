-- 0045_project_admins.sql
--
-- Tabela administratorów paneli wygenerowanych stron (tryb współdzielony).
-- Używana przez /api/projects/[id]/create-admin gdy projekt NIE ma podpiętej
-- zewnętrznej bazy Supabase. Hasła hashowane SHA-256 + salt z env.
--
-- Tryb zewnętrznej bazy (database_url + database_anon_key na projekcie) nie
-- używa tej tabeli — wtedy tworzymy konto bezpośrednio w auth.users projektu
-- klienta przez supabase.auth.signUp().

create table if not exists public.project_admins (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null,
  password_hash text not null,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  unique (project_id, email)
);

create index if not exists project_admins_project_id_idx
  on public.project_admins (project_id);

alter table public.project_admins enable row level security;

-- Tylko właściciel projektu może czytać/zarządzać listą adminów.
drop policy if exists "project_admins: owner read" on public.project_admins;
create policy "project_admins: owner read"
  on public.project_admins for select
  using (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

drop policy if exists "project_admins: owner write" on public.project_admins;
create policy "project_admins: owner write"
  on public.project_admins for all
  using (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  )
  with check (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

comment on table public.project_admins is
  'Konta admina paneli wygenerowanych stron (light-auth tryb shared). '
  'Hasła SHA-256 + salt z env ADMIN_PASSWORD_SALT.';
