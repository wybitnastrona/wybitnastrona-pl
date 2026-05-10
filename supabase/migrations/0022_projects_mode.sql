-- Tryb projektu: Full Stack App / Mobile App / Landing Page (emergent.sh style).
alter table public.projects
  add column if not exists mode text not null default 'landing'
    check (mode in ('fullstack', 'mobile', 'landing'));

create index if not exists projects_mode_idx on public.projects(mode);
