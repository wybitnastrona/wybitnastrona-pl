-- Rozszerzenie listy dozwolonych providerów w user_integrations o OAuth:
--   - supabase_oauth — tokeny dostępu do Supabase Management API
--   - stripe — Stripe Connect (stripe_user_id + access_token)
--
-- Struktura config jsonb obsługuje już dowolne klucze — wystarczy poluzować CHECK.

alter table user_integrations
  drop constraint if exists user_integrations_provider_check;

alter table user_integrations
  add constraint user_integrations_provider_check
  check (provider in (
    'supabase',
    'supabase_oauth',
    'notion',
    'memory',
    'stitch',
    'stripe'
  ));

comment on table user_integrations is
  'Per-user integration configs. Providers: supabase (URL+anon manual), supabase_oauth (access_token + refresh_token), stripe (Connect OAuth: stripe_user_id, access_token), notion, memory, stitch.';
