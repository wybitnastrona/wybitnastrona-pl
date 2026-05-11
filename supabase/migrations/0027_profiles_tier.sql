-- Rork-style platform redesign:
--   1) profiles.tier — flaga FREE / PRO (zastepuje subscription_status w UI).
--   2) projects.mode — przebudowa CHECK na nowe wartosci 'ios' / 'android' / 'web'.
--
-- Migracja jest idempotentna i bezpieczna dla istniejacych danych:
--   - stare wartosci 'fullstack', 'mobile', 'landing' sa zmapowane na 'web' / 'ios' / 'web'.

alter table public.profiles
  add column if not exists tier text not null default 'free';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_tier_check'
  ) then
    alter table public.profiles
      add constraint profiles_tier_check check (tier in ('free', 'pro'));
  end if;
end$$;

create index if not exists profiles_tier_idx on public.profiles(tier);

-- Przebuduj constraint na projects.mode (stare: fullstack/mobile/landing, nowe: ios/android/web).
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'projects_mode_check'
  ) then
    alter table public.projects drop constraint projects_mode_check;
  end if;
end$$;

-- Zmapuj istniejace projekty na nowy enum (zachowujemy historie).
update public.projects
   set mode = case mode
     when 'fullstack' then 'web'
     when 'landing'   then 'web'
     when 'mobile'    then 'ios'  -- bezpieczny default: stare 'mobile' staja sie 'ios'
     else mode
   end
 where mode in ('fullstack', 'landing', 'mobile');

-- Domyslna wartosc na 'web'.
alter table public.projects
  alter column mode set default 'web';

alter table public.projects
  add constraint projects_mode_check check (mode in ('ios', 'android', 'web'));
