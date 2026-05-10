-- Strict owner-only UPDATE/DELETE na projektach. Wsp\u00f3lpraca przeniesiona na osobny mechanizm
-- (np. snapshoty + linki publiczne) — kolaboranci NIE moga edytowac projektu wlasciciela.

-- 1) usun policy ktora dawala edycje wsp\u00f3lpracownikom
drop policy if exists "collab_update" on public.projects;

-- 2) zastap polaczonego SELECTa (owner OR public OR collaborator) prostszym:
--    SELECT moze: wlasciciel + kazdy gdy is_public = true.
drop policy if exists "collab_select" on public.projects;
drop policy if exists "public_read_published" on public.projects;

create policy "public_or_owner_select" on public.projects
  for select using (auth.uid() = user_id or is_public = true);

-- 3) owner_all (FOR ALL) juz pokrywa wlasciciela na INSERT/UPDATE/DELETE/SELECT.
--    Zostaje bez zmian.
