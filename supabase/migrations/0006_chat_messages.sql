-- Wiadomosci czatu projektu (persystencja historii rozmowy z AI).
-- Bez tej tabeli kazde wejscie w projekt powodowalo, ze bot zaczynal od poczatku.

create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  role        text not null check (role in ('user','assistant','system')),
  parts       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists chat_messages_project_idx
  on public.chat_messages(project_id, created_at);

alter table public.chat_messages enable row level security;

drop policy if exists "owner_all" on public.chat_messages;
create policy "owner_all" on public.chat_messages
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
