-- 0043_profiles_stripe_subscription_columns.sql
--
-- Dodaje kolumny Stripe wymagane przez kod aplikacji (webhook, /api/me/points,
-- lib/projects.ts), ktorych brakowalo w poprzednich migracjach.
--
-- Stara migracja (0007_payments.sql) dodawala `subscription_status` i
-- `subscription_tier` do profiles, ale kod aplikacji uzyl nowych nazw
-- `stripe_subscription_*` — stad 500 na /api/me/points i bledy webhooka.
--
-- Wszystkie kolumny sa idempotentne (IF NOT EXISTS).

alter table public.profiles
  -- Stripe Customer ID (powiazanie user → klient Stripe; unikalny index w 0007)
  add column if not exists stripe_customer_id text,
  -- ID aktywnej subskrypcji Stripe (sub_xxx)
  add column if not exists stripe_subscription_id text,
  -- Status subskrypcji: active | trialing | canceled | incomplete | past_due | ...
  add column if not exists stripe_subscription_status text,
  -- Price ID aktywnej subskrypcji (price_xxx) — uzywany do atrybucji tier kredytow
  add column if not exists stripe_subscription_price_id text,
  -- Miesieczny limit kredytow (ilosc z produktu Stripe) dla paska w SideNav
  add column if not exists monthly_credits_limit integer not null default 1500,
  -- Quota uzywana do rate-limitingu (stara nazwa uzywana przez webhook)
  add column if not exists monthly_credit_quota integer;

comment on column public.profiles.stripe_subscription_status is
  'Status subskrypcji Stripe: active, trialing, canceled, incomplete, past_due.';
comment on column public.profiles.stripe_subscription_id is
  'ID subskrypcji Stripe (sub_xxx). Null = brak aktywnej subskrypcji.';
comment on column public.profiles.stripe_subscription_price_id is
  'Price ID aktywnego planu Stripe (price_xxx). Sluzy do atrybucji liczby kredytow.';
comment on column public.profiles.monthly_credits_limit is
  'Miesieczny limit kredytow uzytkownika widoczny w pasku SideNav. FREE=1500, PRO=product.points.';

-- Unikalny index na stripe_customer_id (jezeli nie istnieje z 0007)
create unique index if not exists profiles_stripe_customer_idx
  on public.profiles(stripe_customer_id)
  where stripe_customer_id is not null;
