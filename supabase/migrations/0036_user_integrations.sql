-- Tabela konfiguracji integracji per user (Supabase, Notion, Memory MCP, Stitch MCP).
-- Po skonfigurowaniu — AI dostaje hint w system promptcie i moze uzyc API.

create table if not exists user_integrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('supabase','notion','memory','stitch')),
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table user_integrations enable row level security;

drop policy if exists "user_integrations select own" on user_integrations;
create policy "user_integrations select own"
  on user_integrations for select
  using (auth.uid() = user_id);

drop policy if exists "user_integrations write own" on user_integrations;
create policy "user_integrations write own"
  on user_integrations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
