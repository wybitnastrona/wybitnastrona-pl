-- Wlasna domena dla opublikowanego projektu
-- MVP: trzymamy adres domeny i status weryfikacji.
-- Faktyczna konfiguracja DNS i przypiecie do Vercela odbywa sie poza aplikacja.

alter table public.projects
  add column if not exists custom_domain text,
  add column if not exists custom_domain_verified_at timestamptz;

create unique index if not exists projects_custom_domain_unique_idx
  on public.projects(custom_domain)
  where custom_domain is not null;
