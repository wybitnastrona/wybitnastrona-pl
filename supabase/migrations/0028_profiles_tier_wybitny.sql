-- Faza 5 (Rork Max Build Pipeline): rozszerzenie tier o 'wybitny' + is_wybitny na projektach.
-- Idempotentne, bezpieczne dla istniejacych rekordow.

-- 1) Rozszerzenie CHECK na profiles.tier: free / pro / wybitny.
alter table public.profiles drop constraint if exists profiles_tier_check;
alter table public.profiles
  add constraint profiles_tier_check check (tier in ('free', 'pro', 'wybitny'));

-- 2) Mozliwosc oznaczenia projektu jako WYBITNY (Max Apple Power, ARKit, HealthKit itd.).
alter table public.projects
  add column if not exists is_wybitny boolean not null default false;

-- 3) Trzymanie miesiecznego zuzycia FREE tier (5 kredytow/mc = 50 punktow).
alter table public.profiles
  add column if not exists monthly_credits_used integer not null default 0,
  add column if not exists monthly_credits_reset_at timestamptz default now();

create index if not exists projects_is_wybitny_idx
  on public.projects(is_wybitny)
  where is_wybitny = true;

-- 4) Rozszerzony CHECK na projects.mode o platformy WYBITNY.
alter table public.projects drop constraint if exists projects_mode_check;
alter table public.projects add constraint projects_mode_check
  check (mode in ('ios', 'android', 'web', 'watchos', 'tvos', 'visionos'));
