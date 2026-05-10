-- Custom System Context: per-projekt instrukcje doklejane do systemowego prompta AI.
-- Edytowane w Advanced Controls (przy tworzeniu) i w topbarze projektu.
-- Max ~2000 znakow (limit aplikacyjny, nie DB).

alter table public.projects
  add column if not exists custom_system_context text;
