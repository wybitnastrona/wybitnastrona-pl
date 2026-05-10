-- Analytics: tabela project_events

create table if not exists public.project_events (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  event_type  text not null check (event_type in (
    'view','prompt','publish','remix','edit','export','error'
  )),
  metadata    jsonb,
  user_id     uuid references auth.users(id) on delete set null,
  ip_hash     text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists events_project_idx on public.project_events(project_id);
create index if not exists events_created_idx on public.project_events(created_at desc);
create index if not exists events_type_idx on public.project_events(event_type);

alter table public.project_events enable row level security;

drop policy if exists "owner_read" on public.project_events;
create policy "owner_read" on public.project_events
  for select using (
    exists (
      select 1 from public.projects
      where id = project_events.project_id and user_id = auth.uid()
    )
  );

-- Insert dozwolony przez wszystkich (publiczne event tracking).
drop policy if exists "public_insert" on public.project_events;
create policy "public_insert" on public.project_events
  for insert with check (true);

-- RPC do agregacji
create or replace function public.get_project_stats(p_project_id uuid, p_days integer default 30)
returns table (
  event_type text,
  count bigint,
  day date
) language sql security definer as $$
  select
    event_type,
    count(*) as count,
    created_at::date as day
  from public.project_events
  where project_id = p_project_id
    and created_at >= now() - (p_days || ' days')::interval
  group by event_type, created_at::date
  order by day asc;
$$;
