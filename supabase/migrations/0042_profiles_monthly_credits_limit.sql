-- 0042_profiles_monthly_credits_limit.sql
--
-- Dodaje kolumne `monthly_credits_limit` do profili.
--
-- Powod: SideNav wyswietla pasek postepu zuzycia kredytow (uzyte / limit).
-- Dla FREE limit jest staly = 1500 (FREE_TIER_LIMITS.monthlyCredits w
-- lib/ai-models.ts). Dla PRO wartosc jest dynamicznie ustawiana przez
-- webhook Stripe na podstawie produktu (stripe-products.ts → product.points).
--
-- Default = 1500 zeby wszyscy starzy uzytkownicy domyslnie dostali limit FREE
-- bez NULL-i w UI.

alter table public.profiles
  add column if not exists monthly_credits_limit integer not null default 1500;

comment on column public.profiles.monthly_credits_limit is
  'Miesieczny limit kredytow w UI (pasek SideNav). Dla FREE = 1500, dla PRO = product.points z aktywnej subskrypcji.';
