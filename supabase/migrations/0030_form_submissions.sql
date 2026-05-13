-- Form submissions — zbieranie leadow ze stron wygenerowanych przez AI.
-- Tabela publiczna (insert bez auth) bo formularz kontaktowy wypelnia anonimowy odwiedzajacy.
-- Read dostepny tylko dla wlasciciela projektu (RLS join na projects).

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  -- Dane nadeslanego formularza (dowolny JSON — name, email, message, phone, itp.)
  fields jsonb not null default '{}',
  -- Adres IP + user-agent dla podstawowego anti-spam
  ip_address text,
  user_agent text,
  -- Czy email powiadomienie zostalo wyslane do wlasciciela
  email_sent boolean not null default false,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists form_submissions_project_idx
  on public.form_submissions(project_id);
create index if not exists form_submissions_created_idx
  on public.form_submissions(created_at desc);

alter table public.form_submissions enable row level security;

-- INSERT: kazdy (anon i zalogowany) moze wyslac formularz.
drop policy if exists "public_insert_form_submissions" on public.form_submissions;
create policy "public_insert_form_submissions" on public.form_submissions
  for insert
  with check (true);

-- SELECT: tylko wlasciciel projektu.
drop policy if exists "owner_select_form_submissions" on public.form_submissions;
create policy "owner_select_form_submissions" on public.form_submissions
  for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = form_submissions.project_id
        and p.user_id = auth.uid()
    )
  );

-- DELETE: wlasciciel projektu moze usunac.
drop policy if exists "owner_delete_form_submissions" on public.form_submissions;
create policy "owner_delete_form_submissions" on public.form_submissions
  for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = form_submissions.project_id
        and p.user_id = auth.uid()
    )
  );
