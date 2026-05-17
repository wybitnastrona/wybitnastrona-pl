-- ============================================================
-- Wybitna Baza Danych — shared app database schema
-- ============================================================
-- Apply this file once to the dedicated Supabase project that
-- will serve as the shared database for all generated apps on
-- wybitnastrona.pl.
--
-- Each generated app identifies itself via the `x-project-id`
-- HTTP header in every Supabase JS client request. RLS policies
-- read that header to enforce per-project data isolation.
--
-- Usage:
--   supabase db execute --file supabase/shared-app-db-schema.sql \
--     --db-url "postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"
-- or paste into Supabase Dashboard → SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ── Helper: extract project_id from the request header ─────────────────────
create or replace function public.current_project_id()
  returns text
  language sql
  stable
  security definer
  set search_path = public
as $$
  select nullif(
    current_setting('request.headers', true)::json->>'x-project-id',
    ''
  );
$$;

comment on function public.current_project_id() is
  'Returns the project_id from the x-project-id request header (set by Supabase JS client). Used in RLS policies to isolate data per generated project.';

-- ── categories ──────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id          uuid        primary key default gen_random_uuid(),
  project_id  text        not null,
  name        text        not null,
  slug        text        not null,
  created_at  timestamptz not null default now(),
  unique (project_id, slug)
);

create index if not exists categories_project_id_idx on public.categories (project_id);

alter table public.categories enable row level security;

drop policy if exists "categories: project read"  on public.categories;
drop policy if exists "categories: project write" on public.categories;

create policy "categories: project read" on public.categories
  for select
  using (project_id = public.current_project_id());

create policy "categories: project write" on public.categories
  for all
  using (project_id = public.current_project_id())
  with check (project_id = public.current_project_id());

-- ── products ────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id          uuid        primary key default gen_random_uuid(),
  project_id  text        not null,
  category_id uuid        references public.categories (id) on delete set null,
  name        text        not null,
  description text,
  price_cents integer     not null default 0,
  image_url   text,
  featured    boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists products_project_id_idx   on public.products (project_id);
create index if not exists products_featured_idx     on public.products (project_id, featured) where featured = true;

alter table public.products enable row level security;

drop policy if exists "products: project read"  on public.products;
drop policy if exists "products: project write" on public.products;

create policy "products: project read" on public.products
  for select
  using (project_id = public.current_project_id());

create policy "products: project write" on public.products
  for all
  using (project_id = public.current_project_id())
  with check (project_id = public.current_project_id());

-- ── cart_items ───────────────────────────────────────────────────────────────
create table if not exists public.cart_items (
  id           uuid        primary key default gen_random_uuid(),
  project_id   text        not null,
  user_session text        not null,
  product_id   uuid        not null references public.products (id) on delete cascade,
  qty          integer     not null default 1 check (qty > 0),
  created_at   timestamptz not null default now()
);

create index if not exists cart_items_project_session_idx
  on public.cart_items (project_id, user_session);

alter table public.cart_items enable row level security;

drop policy if exists "cart_items: project all" on public.cart_items;

create policy "cart_items: project all" on public.cart_items
  for all
  using (project_id = public.current_project_id())
  with check (project_id = public.current_project_id());

-- ── get_rls_audit() ─────────────────────────────────────────────────────────
-- Zwraca liste polityk RLS ze schematu `public` z flaga `is_unsafe` gdy
-- klauzula USING lub WITH CHECK efektywnie jest `true` (otwarta brama dla
-- ról `anon` lub `authenticated`).
--
-- Panel "Audyt Bezpieczeństwa" w wybitnastrona.pl wywoluje ta funkcje przez
-- supabase.rpc('get_rls_audit') i wyswietla wykryte luki, oferujac przycisk
-- "Poproś Wybitnego programistę o naprawę".
--
-- SECURITY DEFINER + grant dla anon/authenticated -> kazdy moze odczytac
-- metadane polityk (sa to publiczne informacje schematu).
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
      -- Polityka jest "unsafe" gdy:
      --  - USING/WITH CHECK = 'true' (zawsze przepuszcza), ORAZ
      --  - dotyczy roli anon lub authenticated (nie tylko service_role).
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
  'Audyt RLS dla schematu public. Zwraca polityki ze schematu public i flagę '
  'is_unsafe gdy klauzule sa true dla rol anon/authenticated. Uzywane przez '
  'panel "Audyt Bezpieczenstwa" w wybitnastrona.pl.';
