-- Allow 'discuss' mode in generation_jobs (read-only chat about the codebase).
-- Re-creates the check constraint to include the new value.

alter table public.generation_jobs
  drop constraint if exists generation_jobs_mode_check;

alter table public.generation_jobs
  add constraint generation_jobs_mode_check
  check (mode in ('plan', 'build', 'discuss'));
