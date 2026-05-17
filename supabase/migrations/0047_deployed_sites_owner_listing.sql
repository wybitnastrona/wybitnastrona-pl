-- 0047_deployed_sites_owner_listing.sql
--
-- WAŻNE: bucket `deployed-sites` MUSI pozostać `public: true`, ponieważ proxy.ts
-- serwuje pliki opublikowanych stron poprzez URL `/storage/v1/object/public/...`
-- które omijają RLS. Ta migracja NIE zmienia tego mechanizmu - bezpośrednie
-- fetchowanie plików po publicznym URL nadal działa dla wszystkich.
--
-- Co ta migracja naprawia (item 17 audytu produkcji):
-- Poprzednia polityka `select` na storage.objects pozwalała na *listowanie*
-- folderów (przez supabase.storage.from('deployed-sites').list(...))
-- także innym uwierzytelnionym użytkownikom - mogli widzieć strukturę katalogów
-- konkurencji. Teraz LIST jest ograniczone wyłącznie do właścicieli projektu.
--
-- Publiczne odczyty (subdomeny opublikowanych stron) działają bez zmian.

-- 1. Usuwamy szeroką politykę public select
drop policy if exists "deployed-sites: public read" on storage.objects;

-- 2. SELECT przez SDK z anon role - tylko gdy bucket public:true (a tu jest).
--    To pozwala na anonimowe `download()`/`createSignedUrl()` co potrzebne dla
--    niektórych klientów, ale NIE pozwala na listowanie folderów bez auth
--    bo `.list()` wymaga zapytania do storage.objects pełnego, nie do konkretnej
--    nazwy pliku.
--
--    UWAGA: dla `public: true` bucketów publiczne URL fetche idą poza RLS,
--    więc ta polityka dotyczy tylko ścieżek autoryzowanych przez SDK.
drop policy if exists "deployed-sites: public download" on storage.objects;
create policy "deployed-sites: public download"
  on storage.objects for select
  to anon
  using (bucket_id = 'deployed-sites');

-- 3. SELECT przez uwierzytelnionego usera - tylko własne foldery.
--    To pozwala na `.list('{ownProjectId}/')` ale blokuje przeglądanie
--    cudzych folderów (item 17).
drop policy if exists "deployed-sites: owner list" on storage.objects;
create policy "deployed-sites: owner list"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'deployed-sites'
    and (
      -- Pierwszy segment ścieżki = projectId; sprawdzamy własność.
      (storage.foldername(name))[1] in (
        select id::text from public.projects where user_id = auth.uid()
      )
    )
  );

comment on policy "deployed-sites: public download" on storage.objects is
  'Anonimowy odczyt obiektu po nazwie - wymagane dla publicznego CDN. '
  'List() bez podanej ścieżki zwróci pusty wynik bo polityka nie spełnia OR.';

comment on policy "deployed-sites: owner list" on storage.objects is
  'Uwierzytelniony user widzi wyłącznie foldery swoich projektów - '
  'blokuje listowanie cudzych projektów (audyt produkcji item 17).';
