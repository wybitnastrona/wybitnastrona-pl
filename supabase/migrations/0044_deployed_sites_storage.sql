-- 0044_deployed_sites_storage.sql
--
-- Tworzy bucket Supabase Storage `deployed-sites` dla statycznych buildów
-- (Vite dist/) opublikowanych projektów.
--
-- Bucket jest publiczny (publiczny odczyt przez CDN Supabase).
-- Zapis wyłącznie przez Service Role Key (z /api/projects/[id]/deploy-static).
--
-- Dodaje kolumnę `static_deployed_at` do `projects` — timestamp ostatniego
-- udanego buildu statycznego. proxy.ts używa go jako wskazówki że plik
-- index.html w Storage jest aktualny.

-- ─── Bucket ───────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deployed-sites',
  'deployed-sites',
  true,
  52428800, -- 50 MB limit per plik
  array[
    'text/html',
    'application/javascript',
    'text/css',
    'application/json',
    'image/svg+xml',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/x-icon',
    'font/woff',
    'font/woff2',
    'font/ttf',
    'text/plain',
    'application/octet-stream'
  ]
)
on conflict (id) do nothing;

-- ─── RLS: publiczny odczyt (bucket jest public, ale dodajemy policy dla pewności) ─
create policy if not exists "deployed-sites: public read"
  on storage.objects for select
  using (bucket_id = 'deployed-sites');

-- ─── Kolumna projects.static_deployed_at ─────────────────────────────────────
alter table public.projects
  add column if not exists static_deployed_at timestamptz;

comment on column public.projects.static_deployed_at is
  'Timestamp ostatniego udanego builda statycznego (Vite dist/). '
  'Gdy ustawiony, proxy.ts serwuje pliki z bucketa deployed-sites/{id}/ '
  'zamiast Sandpacka. Zerowany przy unpublish.';
