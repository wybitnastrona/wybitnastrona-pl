-- Preview image url — kolumna na URL screenshota projektu (Supabase Storage).
--
-- Stara kolumna `preview_html` zostaje jako fallback dla projektow, ktorych
-- jeszcze nie zescreenshotowalismy. Dashboard cards beda wolaly:
--   1. preview_image_url (img) — jezeli ustawione
--   2. preview_html (iframe) — fallback
--
-- Screenshot endpoint /api/projects/[id]/screenshot uzywa puppeteer-core +
-- @sparticuz/chromium do zrenderowania subdomeny `{slug}.wybitny.website`
-- i wrzuca PNG do bucketu `project-screenshots` w Supabase Storage.

alter table public.projects
  add column if not exists preview_image_url text;
