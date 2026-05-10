-- Collaborators z rola 'editor' / 'owner' powinni miec UPDATE na projekcie,
-- nie tylko SELECT. Bez tego API patchujace pliki/messages/snapshoty zwraca
-- 403 dla wspolpracownika.
--
-- Zachowujemy istniejace polityki:
--  - public.projects "owner_all"           (FOR ALL, user_id = auth.uid())   -- wlasciciel pelne prawa
--  - public.projects "public_read_published" (FOR SELECT, is_public)
--  - public.projects "collab_select"       (FOR SELECT, jest collaboratorem)
-- I dokladamy:
--  - public.projects "collab_update"       (FOR UPDATE, jest collaboratorem z rola editor lub owner)
--
-- Uwaga: RLS wymaga zarowno USING jak i WITH CHECK dla UPDATE.

drop policy if exists "collab_update" on public.projects;
create policy "collab_update" on public.projects
  for update
  using (
    exists (
      select 1 from public.project_collaborators pc
      where pc.project_id = projects.id
        and pc.user_id    = auth.uid()
        and pc.role in ('editor', 'owner')
    )
  )
  with check (
    exists (
      select 1 from public.project_collaborators pc
      where pc.project_id = projects.id
        and pc.user_id    = auth.uid()
        and pc.role in ('editor', 'owner')
    )
  );

-- Pomocnicza polityka: collaborator widzi liste innych wspolpracownikow tego
-- samego projektu — przez fakt, ze projekt jest jego (collab_select / collab_update).
-- Sprawdzamy to przez join do projects, zeby uniknac rekursywnego SELECT na
-- project_collaborators (ktory wywolalby rekurencje RLS).
drop policy if exists "collab_visible_via_project" on public.project_collaborators;
create policy "collab_visible_via_project" on public.project_collaborators
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = project_collaborators.project_id
        and p.user_id = auth.uid()
    )
  );
