-- Faza 10 (Rork Max Build Pipeline): tabela project_submissions
-- Sluzy do trackowania submission do TestFlight / Play Store.
-- Real-time updates przez Supabase Realtime w UI (submission-tracker.tsx).

create table if not exists public.project_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  platform text not null check (platform in ('ios', 'android')),
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'building', 'uploaded', 'submitted', 'failed', 'canceled')),

  -- Step 1: Details (App Store metadata)
  app_name text,
  bundle_id text,
  version text,
  build_number integer,
  category text,
  description text,
  keywords text[],
  privacy_policy_url text,
  marketing_url text,

  -- Step 2: Build
  asc_key_id text,
  asc_issuer_id text,
  asc_team_id text,
  asc_app_id text,        -- numeric App ID w App Store Connect (po pierwszym buildzie)
  codemagic_workflow_id text,
  codemagic_build_id text,
  codemagic_status text,  -- raw status z Codemagic ('queued', 'building', 'finished', 'failed')

  -- Step 3: Submission outputs
  testflight_url text,
  app_store_url text,
  log_lines text[] default '{}',
  log_url text,
  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_submissions_project_idx
  on public.project_submissions(project_id);
create index if not exists project_submissions_user_idx
  on public.project_submissions(user_id);
create index if not exists project_submissions_status_idx
  on public.project_submissions(status);

alter table public.project_submissions enable row level security;

drop policy if exists "owner_all_submissions" on public.project_submissions;
create policy "owner_all_submissions" on public.project_submissions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Updated_at trigger
create or replace function public.touch_submissions_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists project_submissions_touch_updated on public.project_submissions;
create trigger project_submissions_touch_updated
  before update on public.project_submissions
  for each row execute function public.touch_submissions_updated_at();

-- Pomocnicza tabela na sekrety integracji (ASC p8 keys, Codemagic tokens itp.)
-- Sekretne wartosci szyfrowane app-side (uzytkownik dostaje hash przez UI,
-- realny secret trzymamy w Supabase Vault gdy bedzie skonfigurowany).
create table if not exists public.user_integration_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in (
    'app_store_connect',
    'codemagic',
    'eas',
    'google_play'
  )),
  -- Nazwa wyswietlana ('Mois ASC Key', 'Production codemagic')
  display_name text not null,
  -- Pola wlasciwe per provider:
  asc_key_id text,
  asc_issuer_id text,
  asc_team_id text,
  asc_private_key text, -- zaszyfrowane / Vault reference
  codemagic_token text,
  eas_token text,
  google_play_service_account_json text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_integration_credentials enable row level security;

drop policy if exists "owner_all_credentials" on public.user_integration_credentials;
create policy "owner_all_credentials" on public.user_integration_credentials
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists user_integration_credentials_user_idx
  on public.user_integration_credentials(user_id);
