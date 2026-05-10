-- Wybor template'a (frameworka) dla projektu

alter table public.projects
  add column if not exists template text not null default 'react-ts';

create index if not exists projects_template_idx on public.projects(template);
