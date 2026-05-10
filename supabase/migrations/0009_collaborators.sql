-- Wspolpraca: tabela project_collaborators

create table if not exists public.project_collaborators (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null check (role in ('owner','editor','viewer')) default 'editor',
  invited_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  unique(project_id, user_id)
);

create index if not exists collab_project_idx on public.project_collaborators(project_id);
create index if not exists collab_user_idx on public.project_collaborators(user_id);

alter table public.project_collaborators enable row level security;

drop policy if exists "owner_full" on public.project_collaborators;
create policy "owner_full" on public.project_collaborators
  for all using (
    exists (
      select 1 from public.projects
      where id = project_collaborators.project_id and user_id = auth.uid()
    )
  );

drop policy if exists "self_read" on public.project_collaborators;
create policy "self_read" on public.project_collaborators
  for select using (user_id = auth.uid());

-- Rozszerzenie polityki RLS na projects: wspolpracownicy moga czytac/edytowac
drop policy if exists "collab_select" on public.projects;
create policy "collab_select" on public.projects
  for select using (
    user_id = auth.uid()
    or is_public = true
    or exists (
      select 1 from public.project_collaborators
      where project_id = projects.id and user_id = auth.uid()
    )
  );
