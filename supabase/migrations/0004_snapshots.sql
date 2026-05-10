-- Snapshoty projektu (cofanie do poprzedniej wersji).
-- Rekord tworzony automatycznie przez API generate po kazdej udanej iteracji AI.
-- Uzytkownik moze cofnac sie do dowolnego snapshotu.

create table if not exists public.project_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  files jsonb not null,
  label text,
  created_at timestamptz not null default now()
);

create index if not exists snapshots_project_id_idx
  on public.project_snapshots(project_id);

create index if not exists snapshots_project_created_idx
  on public.project_snapshots(project_id, created_at desc);

alter table public.project_snapshots enable row level security;

-- Wlasciciel projektu moze czytac i tworzyc snapshoty.
create policy "owner_all_snapshots" on public.project_snapshots
  for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );
