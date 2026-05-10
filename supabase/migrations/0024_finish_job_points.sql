-- finish_job rozszerzone o dekrementacje punktow uzytkownika.
-- p_points_consumed > 0 => odejmuje kredyty od profiles.points (min 0).
-- Wywolywane przez app/api/generate/route.ts po zakonczeniu generacji.

create or replace function public.finish_job(
  p_job_id          uuid,
  p_status          text    default 'completed',
  p_error           text    default null,
  p_input_tokens    int     default null,
  p_output_tokens   int     default null,
  p_total_tokens    int     default null,
  p_points_spent    int     default null,
  p_is_continue     boolean default false,
  p_points_consumed int     default 0
)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
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
    points_spent  = coalesce(p_points_spent, points_spent),
    is_continue   = coalesce(p_is_continue, false)
  where id = p_job_id
  returning user_id into v_user_id;

  if p_points_consumed > 0 and v_user_id is not null then
    update public.profiles
      set points = greatest(0, points - p_points_consumed),
          updated_at = now()
    where id = v_user_id;
  end if;
end;
$$;
