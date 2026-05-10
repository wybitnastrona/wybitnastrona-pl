-- Profile uzytkownikow z systemem punktow.
-- Profil tworzony automatycznie przy rejestracji przez trigger.

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  points     integer not null default 1000,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Wlasciciel moze czytac i aktualizowac swoj profil.
drop policy if exists "owner_all" on public.profiles;
create policy "owner_all" on public.profiles
  for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger automatycznie tworzy profil przy rejestracji.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles(id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tworz profil dla uzytkownikow, ktorzy juz istnieja (backfill).
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- ─── Funkcja atomowego odejmowania punktow ──────────────────────────────────
-- Zwraca nowe saldo.  Rzuca wyjatek "Insufficient points" jesli saldo < amount.
-- Uzywaj przez supabase.rpc('deduct_points', { p_user_id: ..., amount: ... }).
create or replace function public.deduct_points(p_user_id uuid, amount integer)
returns integer
language plpgsql
security definer
as $$
declare
  current_points integer;
  new_balance    integer;
begin
  -- Blokada wiersza (FOR UPDATE) zapobiega race condition.
  select points into current_points
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found for user %', p_user_id;
  end if;

  if current_points < amount then
    raise exception 'Insufficient points: have %, need %', current_points, amount;
  end if;

  update public.profiles
  set points = points - amount, updated_at = now()
  where id = p_user_id
  returning points into new_balance;

  return new_balance;
end;
$$;

-- ─── Funkcja sprawdzania salda (read-only, bez blokady) ─────────────────────
create or replace function public.get_points(p_user_id uuid)
returns integer
language sql
security definer
stable
as $$
  select coalesce(points, 0) from public.profiles where id = p_user_id;
$$;
