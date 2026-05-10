-- System płatności Stripe + pakiety punktów

create table if not exists public.payments (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  stripe_session_id     text unique,
  stripe_subscription_id text,
  stripe_customer_id    text,
  product_id            text not null,
  amount_cents          integer not null,
  currency              text not null default 'pln',
  points_added          integer not null default 0,
  status                text not null check (status in ('pending','succeeded','failed','refunded')) default 'pending',
  metadata              jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists payments_user_idx on public.payments(user_id);
create index if not exists payments_session_idx on public.payments(stripe_session_id);

alter table public.payments enable row level security;

drop policy if exists "owner_read" on public.payments;
create policy "owner_read" on public.payments
  for select using (auth.uid() = user_id);

-- Subskrypcje (rozszerzenie profiles o aktywny plan)
alter table public.profiles
  add column if not exists subscription_tier text default 'free' check (subscription_tier in ('free','pro','team')),
  add column if not exists subscription_status text,
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists stripe_customer_id text;

create unique index if not exists profiles_stripe_customer_idx
  on public.profiles(stripe_customer_id)
  where stripe_customer_id is not null;

-- RPC: doladuj punkty (wywolywane z webhooka Stripe, security definer)
create or replace function public.add_points(p_user_id uuid, amount integer)
returns integer language plpgsql security definer as $$
declare
  new_balance integer;
begin
  insert into public.profiles(id) values (p_user_id) on conflict (id) do nothing;
  update public.profiles
    set points = points + amount, updated_at = now()
    where id = p_user_id
    returning points into new_balance;
  return new_balance;
end;
$$;
