-- 0046_security_audit_rpc.sql
--
-- Funkcja RPC `get_rls_audit()` używana przez panel "Audyt Bezpieczeństwa"
-- w wybitnastrona.pl. Aplikuj tę migrację zarówno na platformowym Supabase
-- jak i na shared Wybitnej Bazie Danych (dla kompletności).
--
-- Funkcja zwraca listę polityk RLS w schemacie `public` z flagą `is_unsafe`
-- oznaczającą polityki gdzie klauzule USING / WITH CHECK są ustawione na
-- `true` dla ról anon / authenticated / public (otwarta brama).

create or replace function public.get_rls_audit()
  returns table (
    tablename   text,
    policyname  text,
    cmd         text,
    roles       text[],
    qual        text,
    with_check  text,
    is_unsafe   boolean,
    reason      text
  )
  language sql
  stable
  security definer
  set search_path = public, pg_catalog
as $$
  select
    p.tablename::text,
    p.policyname::text,
    p.cmd::text,
    p.roles::text[],
    p.qual::text,
    p.with_check::text,
    (
      (
        (p.qual = 'true' or p.qual is null and p.cmd in ('INSERT'))
        or p.with_check = 'true'
      )
      and (
        'anon' = any(p.roles)
        or 'authenticated' = any(p.roles)
        or 'public' = any(p.roles)
      )
    ) as is_unsafe,
    case
      when p.qual = 'true' and p.with_check = 'true' then
        'Klauzule USING i WITH CHECK ustawione na true - polityka nie chroni danych.'
      when p.qual = 'true' then
        'Klauzula USING ustawiona na true - kazdy moze odczytac/zmienic dane.'
      when p.with_check = 'true' then
        'Klauzula WITH CHECK ustawiona na true - kazdy moze wstawic dowolne dane.'
      else 'OK'
    end as reason
  from pg_policies p
  where p.schemaname = 'public'
  order by p.tablename, p.cmd, p.policyname;
$$;

grant execute on function public.get_rls_audit() to anon, authenticated;

comment on function public.get_rls_audit() is
  'Audyt RLS dla schematu public. Zwraca polityki i flagę is_unsafe gdy '
  'klauzule sa true dla rol anon/authenticated. Uzywane przez panel '
  'Audyt Bezpieczenstwa w wybitnastrona.pl.';
