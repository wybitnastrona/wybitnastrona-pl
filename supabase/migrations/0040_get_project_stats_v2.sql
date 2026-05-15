-- Analytics v2: get_project_stats z bucketem godzinowym.
--
-- Stara funkcja `get_project_stats` agregowala zawsze per dzien (`created_at::date`).
-- Nowa wersja akceptuje `p_bucket_hours` (np. 6, 12, 24) i wyrzuca `bucket
-- timestamptz` zaokraglony do dolu uzywajac `date_bin`. Pozwala UI pokazac:
--   - 7 dni z bucketem 6h (28 slupkow)
--   - 14 dni z bucketem 12h (28 slupkow)
--   - 30 dni z bucketem 24h (30 slupkow)
--
-- Stara funkcja `get_project_stats(p_project_id, p_days)` jest zachowana
-- dla wstecznej kompatybilnosci.

create or replace function public.get_project_stats_v2(
  p_project_id uuid,
  p_days integer default 30,
  p_bucket_hours integer default 24
)
returns table (
  bucket timestamptz,
  event_type text,
  count bigint
) language sql security definer as $$
  select
    date_bin((p_bucket_hours || ' hours')::interval, created_at, timestamptz 'epoch') as bucket,
    event_type,
    count(*)::bigint as count
  from public.project_events
  where project_id = p_project_id
    and created_at >= now() - (p_days || ' days')::interval
  group by 1, 2
  order by 1 asc;
$$;
