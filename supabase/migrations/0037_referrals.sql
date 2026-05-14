-- Program poleceń (referral).
-- Webhook Stripe (invoice.paid) wywoluje maybeAwardReferralReward który czyta
-- te kolumny i naliczy 300 kredytów dla `referrer_id` po pierwszej platnosci `referee_id`.

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referee_id uuid not null references auth.users(id) on delete cascade,
  referee_first_payment_at timestamptz,
  reward_credits integer not null default 0,
  awarded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (referee_id)
);

create index if not exists referrals_referrer_idx on referrals(referrer_id);

alter table referrals enable row level security;

drop policy if exists "referrals select own" on referrals;
create policy "referrals select own"
  on referrals for select
  using (auth.uid() = referrer_id or auth.uid() = referee_id);

-- profiles.referral_code — krotki nanoid, unikalny per user.
alter table profiles add column if not exists referral_code text unique;

-- Generator default — krotki kod (8 znakow alfanum) gdy brak.
create or replace function ensure_referral_code(p_user_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_code text;
begin
  select referral_code into v_code from profiles where id = p_user_id;
  if v_code is not null then return v_code; end if;
  -- Wygeneruj losowy 8-znakowy kod
  loop
    v_code := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    begin
      update profiles set referral_code = v_code where id = p_user_id;
      exit;
    exception when unique_violation then
      continue;
    end;
  end loop;
  return v_code;
end;
$$;

grant execute on function ensure_referral_code(uuid) to authenticated;
