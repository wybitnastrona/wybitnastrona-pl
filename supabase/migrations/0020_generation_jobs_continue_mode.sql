-- Iterative generation: dodajemy 'continue' jako wartosc generation_jobs.mode.
-- Tryb continue = uzytkownik klika "Kontynuuj generowanie" gdy wczesniejsza
-- tura sie nie skonczyla (timeout, limit krokow). Z perspektywy kosztow i
-- odpowiedzialnosci AI traktujemy go jak build.

alter table public.generation_jobs
  drop constraint if exists generation_jobs_mode_check;

alter table public.generation_jobs
  add constraint generation_jobs_mode_check
  check (mode in ('plan', 'build', 'discuss', 'continue'));
