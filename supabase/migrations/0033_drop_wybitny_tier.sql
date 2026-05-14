-- Usuwamy tier 'wybitny' — wszystko zostaje przepiete do 'pro' (Bolt-style slider).
-- Najpierw aktualizujemy istniejacych uzytkownikow, potem dropujemy constraint
-- i tworzymy nowy z dwoma wartosciami: 'free' i 'pro'.

update profiles set tier = 'pro' where tier = 'wybitny';

alter table profiles drop constraint if exists profiles_tier_check;
alter table profiles add constraint profiles_tier_check
  check (tier in ('free', 'pro'));
