-- Generation jobs table — tracks every AI generation run per project.
-- Used for Realtime progress updates and stale-job detection.

create table public.generation_jobs (
  id            uuid        primary key default gen_random_uuid(),
  project_id    uuid        not null references public.projects(id) on delete cascade,
  user_id       uuid        not null references auth.users(id) on delete cascade,
  status        text        not null default 'pending'
                            check (status in ('pending', 'running', 'completed', 'failed', 'stalled')),
  mode          text        not null check (mode in ('plan', 'build', 'discuss')),
  model         text        not null,
  current_step  int         not null default 0,
  total_steps   int,
  current_action text,
  files_written text[]      not null default '{}',
  files_patched text[]      not null default '{}',
  error         text,
  started_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  finished_at   timestamptz
);

create index generation_jobs_project_idx
  on public.generation_jobs (project_id, started_at desc);

create index generation_jobs_status_idx
  on public.generation_jobs (status)
  where status in ('pending', 'running');

alter table public.generation_jobs enable row level security;

create policy gj_owner
  on public.generation_jobs
  for all
  using (auth.uid() = user_id);

-- Enable Realtime so the frontend can subscribe to live progress updates.
alter publication supabase_realtime add table public.generation_jobs;

-- RPC: atomically increment current_step and update action/file lists.
-- Avoids race conditions in bumpJob — single round-trip.
create or replace function public.bump_job(
  p_job_id     uuid,
  p_action     text,
  p_file_path  text    default null,
  p_file_kind  text    default null   -- 'write' | 'patch' | null
)
returns void
language plpgsql
security definer
as $$
begin
  update public.generation_jobs
  set
    current_step   = current_step + 1,
    current_action = p_action,
    updated_at     = now(),
    files_written  = case
                       when p_file_kind = 'write' and p_file_path is not null
                       then array_append(files_written, p_file_path)
                       else files_written
                     end,
    files_patched  = case
                       when p_file_kind = 'patch' and p_file_path is not null
                       then array_append(files_patched, p_file_path)
                       else files_patched
                     end
  where id = p_job_id;
end;
$$;

-- RPC: stale-job sweeper — called by cron.
-- Marks jobs that have been running for >120s without a heartbeat as 'stalled'.
-- Returns the number of rows updated.
create or replace function public.mark_stale_jobs()
returns int
language plpgsql
security definer
as $$
declare
  updated_count int;
begin
  update public.generation_jobs
  set status = 'stalled', updated_at = now()
  where status = 'running'
    and updated_at < now() - interval '120 seconds';

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

-- RPC: mark job as completed or failed.
create or replace function public.finish_job(
  p_job_id  uuid,
  p_status  text default 'completed',  -- 'completed' | 'failed'
  p_error   text default null
)
returns void
language plpgsql
security definer
as $$
begin
  update public.generation_jobs
  set
    status      = p_status,
    error       = p_error,
    finished_at = now(),
    updated_at  = now()
  where id = p_job_id;
end;
$$;
