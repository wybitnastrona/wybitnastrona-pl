-- Profiles: kolumny wymagane przez onboarding i UI.
--
-- Bez tych kolumn:
--  - app/onboarding/page.tsx crashuje na update({ display_name, role, company_size, onboarding_completed })
--  - app/auth/callback/route.ts nie potrafi sprawdzic czy uzytkownik ma juz onboarding
--  - middleware/proxy nie moze sterowac przekierowaniem nowych userow.

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists display_name text,
  add column if not exists role text,
  add column if not exists company_size text;

-- Backfill: istniejace konta (sprzed migracji) traktujemy jak onboarding_completed = true,
-- zeby uzytkownicy nie wpadali w petle przekierowan na /onboarding po wdrozeniu.
-- Heurystyka: wszystkie obecnie istniejace profile -> ukonczony onboarding.
-- Nowi uzytkownicy beda dostawac default false z definicji kolumny.
update public.profiles
   set onboarding_completed = true
 where onboarding_completed = false;

-- (handle_new_user juz tworzy wiersz z domyslnymi wartosciami — nie ruszamy triggera.)
