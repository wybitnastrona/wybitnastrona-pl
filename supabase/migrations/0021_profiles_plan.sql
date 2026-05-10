-- Plan subskrypcji uzytkownika.
-- Domyslnie 'free'. Stripe webhook ustawia 'pro' lub 'team'.
-- Uzywane do ograniczenia dostepu do modeli Claude (Sonnet/Opus tylko Pro+).

alter table public.profiles
  add column if not exists plan text not null default 'free'
  check (plan in ('free', 'pro', 'team'));

-- Istniejace konta dostaja 'free' (default), wiec backfill nie jest potrzebny.
