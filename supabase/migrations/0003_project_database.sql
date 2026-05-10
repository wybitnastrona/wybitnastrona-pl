-- Personalizacja bazy danych per projekt uzytkownika.
-- MVP: trzymamy URL i anon key wlasnego projektu Supabase, ktory uzytkownik
-- chce podpiac do swojej wygenerowanej strony. W kolejnym etapie mozemy
-- automatycznie generowac nowy projekt Supabase przez API zarzadzania.

alter table public.projects
  add column if not exists database_url text,
  add column if not exists database_anon_key text;
