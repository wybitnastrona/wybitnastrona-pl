-- Dzienne liczniki uzycia kredytow (FREE tier rate-limit 30 kr/dzien).
-- monthly_credits_used jest juz w 0028 — dodajemy daily.
--
-- ─── ADR: rolling 30-day window (audyt produkcji item 38) ────────────────
-- monthly_credits_reset_at jest aktualizowany przy pierwszym użyciu w nowym
-- oknie - czyli reset nastąpi DOKŁADNIE 30 dni od ostatniego użycia, NIE
-- od początku miesiąca kalendarzowego ani daty założenia konta.
--
-- Decyzja produktowa: rolling window jest bardziej "fair" niż calendar
-- reset (user który zarejestrował się 31 grudnia o 23:59 nie traci całego
-- miesięcznego limitu o północy). Dla anchor "rocznicowy reset od daty
-- założenia konta" wystarczyłoby zmienić initial reset_at na profile.created_at.
-- ─────────────────────────────────────────────────────────────────────────

alter table profiles
  add column if not exists daily_credits_used integer not null default 0;

alter table profiles
  add column if not exists daily_credits_reset_at timestamptz not null default now();

-- RPC do atomicznej inkrementacji licznikow uzycia po kazdej generacji.
-- Wywolywane z app/api/generate/route.ts onFinish po finish_job.
create or replace function bump_usage_counters(
  p_user_id uuid,
  p_amount integer
)
returns void
language plpgsql
security definer
as $$
declare
  v_now timestamptz := now();
  v_daily_reset timestamptz;
  v_monthly_reset timestamptz;
begin
  -- Pobieramy reset timestamps (NULL przy starcie → traktujemy jako 'dawno').
  select daily_credits_reset_at, monthly_credits_reset_at
    into v_daily_reset, v_monthly_reset
    from profiles
   where id = p_user_id;

  if v_daily_reset is null then v_daily_reset := v_now - interval '1 day'; end if;
  if v_monthly_reset is null then v_monthly_reset := v_now - interval '31 days'; end if;

  update profiles set
    daily_credits_used = case
      when v_daily_reset < (v_now - interval '24 hours') then p_amount
      else daily_credits_used + p_amount
    end,
    daily_credits_reset_at = case
      when v_daily_reset < (v_now - interval '24 hours') then v_now
      else daily_credits_reset_at
    end,
    monthly_credits_used = case
      when v_monthly_reset < (v_now - interval '30 days') then p_amount
      else monthly_credits_used + p_amount
    end,
    monthly_credits_reset_at = case
      when v_monthly_reset < (v_now - interval '30 days') then v_now
      else monthly_credits_reset_at
    end
   where id = p_user_id;
end;
$$;

grant execute on function bump_usage_counters(uuid, integer) to authenticated;
