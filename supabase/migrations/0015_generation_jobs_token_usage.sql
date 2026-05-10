-- Track real token usage per generation job for cost transparency.

alter table public.generation_jobs
  add column if not exists input_tokens  int,
  add column if not exists output_tokens int,
  add column if not exists total_tokens  int,
  add column if not exists points_spent  int;

-- Update finish_job to also persist token usage in one round-trip.
create or replace function public.finish_job(
  p_job_id          uuid,
  p_status          text default 'completed',
  p_error           text default null,
  p_input_tokens    int  default null,
  p_output_tokens   int  default null,
  p_total_tokens    int  default null,
  p_points_spent    int  default null
)
returns void
language plpgsql
security definer
as $$
begin
  update public.generation_jobs
  set
    status        = p_status,
    error         = p_error,
    finished_at   = now(),
    updated_at    = now(),
    input_tokens  = coalesce(p_input_tokens, input_tokens),
    output_tokens = coalesce(p_output_tokens, output_tokens),
    total_tokens  = coalesce(p_total_tokens, total_tokens),
    points_spent  = coalesce(p_points_spent, points_spent)
  where id = p_job_id;
end;
$$;
