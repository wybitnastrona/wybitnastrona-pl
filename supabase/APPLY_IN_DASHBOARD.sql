-- ============================================================
-- MASTER MIGRATION: wybitnastrona.pl → Supabase Dashboard
-- ============================================================
-- Uruchom CALY ten plik w Supabase Dashboard:
--   Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- 1) profiles.tier: free | pro | wybitny
alter table public.profiles add column if not exists tier text not null default 'free';
do $$ begin
  if not exists (select 1 from pg_constraint where conname='profiles_tier_check') then
    alter table public.profiles add constraint profiles_tier_check check (tier in ('free','pro','wybitny'));
  end if;
end$$;
alter table public.profiles add column if not exists monthly_credits_used integer not null default 0;
alter table public.profiles add column if not exists monthly_credits_reset_at timestamptz default now();
create index if not exists profiles_tier_idx on public.profiles(tier);

-- 2) projects.mode — ios/android/web/watchos/tvos/visionos
alter table public.projects add column if not exists mode text not null default 'web';
alter table public.projects add column if not exists is_wybitny boolean not null default false;
alter table public.projects add column if not exists custom_system_context text;
alter table public.projects add column if not exists locked_files jsonb not null default '[]';
alter table public.projects add column if not exists template text not null default 'react-ts';
alter table public.projects add column if not exists is_public boolean not null default false;
alter table public.projects add column if not exists published_at timestamptz;
alter table public.projects add column if not exists slug text;
alter table public.projects add column if not exists database_url text;
alter table public.projects add column if not exists database_anon_key text;
alter table public.projects add column if not exists custom_domain text;
alter table public.projects add column if not exists custom_domain_verified_at timestamptz;
alter table public.projects add column if not exists stripe_publishable_key text;
alter table public.projects add column if not exists stripe_secret_key_enc text;
alter table public.projects add column if not exists stripe_webhook_secret text;
-- RLS i trigger na projects
alter table public.projects enable row level security;
drop policy if exists "owner_all" on public.projects;
create policy "owner_all" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "public_read_published" on public.projects;
create policy "public_read_published" on public.projects for select using (is_public = true);

-- 3) Tabela project_submissions (iOS/Android App Store publishing)
create table if not exists public.project_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios','android')),
  status text not null default 'draft' check (status in ('draft','queued','building','uploaded','submitted','failed','canceled')),
  app_name text, bundle_id text, version text, build_number integer,
  category text, description text, keywords text[], privacy_policy_url text, marketing_url text,
  asc_key_id text, asc_issuer_id text, asc_team_id text, asc_app_id text,
  codemagic_workflow_id text, codemagic_build_id text, codemagic_status text,
  testflight_url text, app_store_url text,
  log_lines text[] default '{}', log_url text, error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists project_submissions_project_idx on public.project_submissions(project_id);
create index if not exists project_submissions_user_idx on public.project_submissions(user_id);
create index if not exists project_submissions_status_idx on public.project_submissions(status);
alter table public.project_submissions enable row level security;
drop policy if exists "owner_all_submissions" on public.project_submissions;
create policy "owner_all_submissions" on public.project_submissions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create or replace function public.touch_submissions_updated_at() returns trigger as $$ begin new.updated_at := now(); return new; end; $$ language plpgsql;
drop trigger if exists project_submissions_touch_updated on public.project_submissions;
create trigger project_submissions_touch_updated before update on public.project_submissions for each row execute function public.touch_submissions_updated_at();

-- 4) Tabela form_submissions (zbieranie leadow ze stron)
create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  fields jsonb not null default '{}',
  ip_address text, user_agent text,
  email_sent boolean not null default false,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists form_submissions_project_idx on public.form_submissions(project_id);
alter table public.form_submissions enable row level security;
drop policy if exists "public_insert_form_submissions" on public.form_submissions;
create policy "public_insert_form_submissions" on public.form_submissions for insert with check (true);
drop policy if exists "owner_select_form_submissions" on public.form_submissions;
create policy "owner_select_form_submissions" on public.form_submissions for select using (
  exists (select 1 from public.projects p where p.id = form_submissions.project_id and p.user_id = auth.uid())
);

-- 5) Tabela user_integration_credentials (ASC, Codemagic, Google Play)
create table if not exists public.user_integration_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('app_store_connect','codemagic','eas','google_play','notion','linear','custom_mcp')),
  display_name text not null,
  asc_key_id text, asc_issuer_id text, asc_team_id text, asc_private_key text,
  codemagic_token text, eas_token text, google_play_service_account_json text,
  notion_token text, linear_api_key text,
  custom_mcp_url text, custom_mcp_config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_integration_credentials enable row level security;
drop policy if exists "owner_all_credentials" on public.user_integration_credentials;
create policy "owner_all_credentials" on public.user_integration_credentials for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists user_integration_credentials_user_idx on public.user_integration_credentials(user_id, provider);

-- 6) Tabela user_favorites (zapisane szablony/prompty)
create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('prompt','project','template')),
  item_id text not null,
  item_label text,
  created_at timestamptz not null default now()
);
alter table public.user_favorites enable row level security;
drop policy if exists "owner_all_favorites" on public.user_favorites;
create policy "owner_all_favorites" on public.user_favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create unique index if not exists user_favorites_unique on public.user_favorites(user_id, item_type, item_id);
create index if not exists user_favorites_user_idx on public.user_favorites(user_id);

-- 7) Tabela project_snapshots (historia zmian)
create table if not exists public.project_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  files jsonb not null default '{}',
  label text,
  message_id text,
  created_at timestamptz not null default now()
);
alter table public.project_snapshots enable row level security;
drop policy if exists "owner_all_snapshots" on public.project_snapshots;
create policy "owner_all_snapshots" on public.project_snapshots for all using (
  exists (select 1 from public.projects p where p.id = project_snapshots.project_id and p.user_id = auth.uid())
);

-- 8) Tabela project_chat_messages
create table if not exists public.project_chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  parts jsonb not null default '[]',
  created_at timestamptz not null default now()
);
alter table public.project_chat_messages enable row level security;
drop policy if exists "owner_all_chat_messages" on public.project_chat_messages;
create policy "owner_all_chat_messages" on public.project_chat_messages for all using (
  exists (select 1 from public.projects p where p.id = project_chat_messages.project_id and p.user_id = auth.uid())
);

-- 9) Tabela generation_jobs
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'running' check (status in ('running','done','failed','timeout')),
  current_action text,
  step integer not null default 0,
  files_written text[] default '{}',
  files_patched text[] default '{}',
  token_input_total integer not null default 0,
  token_output_total integer not null default 0,
  points_consumed integer not null default 0,
  is_continue boolean not null default false,
  discuss_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.generation_jobs enable row level security;
drop policy if exists "owner_all_jobs" on public.generation_jobs;
create policy "owner_all_jobs" on public.generation_jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 10) Tabela profiles (uzytkownik, kredyty)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  stripe_customer_id text,
  points integer not null default 100,
  tier text not null default 'free',
  monthly_credits_used integer not null default 0,
  monthly_credits_reset_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "owner_all_profiles" on public.profiles;
create policy "owner_all_profiles" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- Trigger auto-tworzenia profilu przy rejestracji
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, points, tier)
  values (new.id, new.email, 100, 'free')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 11) RPC: add_points i finish_job
create or replace function public.add_points(p_user_id uuid, amount integer) returns void as $$
begin
  insert into public.profiles (id, points) values (p_user_id, amount)
  on conflict (id) do update set points = profiles.points + amount;
end;
$$ language plpgsql security definer;

create or replace function public.deduct_points(p_user_id uuid, amount integer) returns boolean as $$
declare v_points integer;
begin
  select points into v_points from public.profiles where id = p_user_id for update;
  if v_points is null or v_points < amount then return false; end if;
  update public.profiles set points = points - amount where id = p_user_id;
  return true;
end;
$$ language plpgsql security definer;

create or replace function public.finish_job(
  p_job_id uuid, p_status text, p_points_consumed integer default 0, p_is_continue boolean default false
) returns void as $$
declare v_user_id uuid;
begin
  select user_id into v_user_id from public.generation_jobs where id = p_job_id;
  update public.generation_jobs set status = p_status, is_continue = p_is_continue, updated_at = now() where id = p_job_id;
  if p_points_consumed > 0 and v_user_id is not null then
    update public.profiles set points = greatest(0, points - p_points_consumed) where id = v_user_id;
  end if;
end;
$$ language plpgsql security definer;

-- 12) knowledge_docs (RAG context)
create table if not exists public.knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);
alter table public.knowledge_docs enable row level security;
drop policy if exists "owner_all_knowledge" on public.knowledge_docs;
create policy "owner_all_knowledge" on public.knowledge_docs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 13) payments (Stripe)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_session_id text,
  stripe_customer_id text,
  product_id text,
  amount_cents integer,
  currency text,
  points_added integer default 0,
  status text default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payments enable row level security;
drop policy if exists "owner_select_payments" on public.payments;
create policy "owner_select_payments" on public.payments for select using (auth.uid() = user_id);

-- 14) stripe_events (idempotency)
create table if not exists public.stripe_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique not null,
  type text,
  created_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;

-- 15) pgvector + match_knowledge (RAG dla pliku knowledge base)
-- UWAGA: jesli "could not open extension control file" — wlacz pgvector w Dashboard:
-- Dashboard → Database → Extensions → vector
create extension if not exists vector;
alter table public.knowledge_docs add column if not exists embedding vector(1536);

create or replace function public.match_knowledge(
  p_user_id uuid, p_project_id uuid,
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 3
) returns table (id uuid, title text, content text, similarity float) as $$
begin
  return query
  select k.id, k.title, k.content,
    1 - (k.embedding <=> query_embedding) as similarity
  from public.knowledge_docs k
  where k.user_id = p_user_id
    and k.embedding is not null
    and 1 - (k.embedding <=> query_embedding) > match_threshold
  order by k.embedding <=> query_embedding
  limit match_count;
end;
$$ language plpgsql;

-- ============================================================
-- 0042: monthly_credits_limit na profiles (pasek SideNav)
-- ============================================================
alter table public.profiles
  add column if not exists monthly_credits_limit integer not null default 1500;

comment on column public.profiles.monthly_credits_limit is
  'Miesieczny limit kredytow uzytkownika widoczny w pasku SideNav. FREE=1500, PRO=product.points.';

-- ============================================================
-- 0043: kolumny Stripe na profiles (wymagane przez webhook + /api/me/points)
-- ============================================================
alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_subscription_status text,
  add column if not exists stripe_subscription_price_id text,
  add column if not exists monthly_credit_quota integer;

comment on column public.profiles.stripe_subscription_status is
  'Status subskrypcji Stripe: active, trialing, canceled, incomplete, past_due.';
comment on column public.profiles.stripe_subscription_id is
  'ID subskrypcji Stripe (sub_xxx). Null = brak aktywnej subskrypcji.';
comment on column public.profiles.stripe_subscription_price_id is
  'Price ID aktywnego planu Stripe (price_xxx). Sluzy do atrybucji liczby kredytow.';

create unique index if not exists profiles_stripe_customer_idx
  on public.profiles(stripe_customer_id)
  where stripe_customer_id is not null;

-- ============================================================
-- KONIEC MIGRACJI
-- ============================================================
-- Po uruchomieniu odswiezcie strone wybitnastrona.pl
-- Wszystkie funkcje powinny dzialac: generowanie, submisje, formularze, RAG.
-- ============================================================
