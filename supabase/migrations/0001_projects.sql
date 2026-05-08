-- Tabela projektów wybitnastrona.pl
-- Każdy rekord = jeden wygenerowany projekt (zestaw plików).

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text unique,
  title text not null default 'Untitled project',
  prompt text not null,
  files jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists projects_slug_idx on public.projects(slug) where slug is not null;

alter table public.projects enable row level security;

drop policy if exists "owner_all" on public.projects;
create policy "owner_all" on public.projects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "public_read_published" on public.projects;
create policy "public_read_published" on public.projects
  for select
  using (is_public = true);

create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();
