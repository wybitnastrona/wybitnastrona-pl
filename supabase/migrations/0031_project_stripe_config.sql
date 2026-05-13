-- Konfiguracja Stripe per projekt — klient podpina swoje konto Stripe.
-- Klucze sa trzymane po stronie aplikacji (serwer-only), nie wystawiane do frontu.
alter table public.projects
  add column if not exists stripe_publishable_key text,
  add column if not exists stripe_secret_key_enc text,   -- zaszyfrowany klucz prywatny
  add column if not exists stripe_webhook_secret text;   -- webhook signing secret

comment on column public.projects.stripe_publishable_key is 'Klucz publiczny Stripe klienta (pk_live_... lub pk_test_...)';
comment on column public.projects.stripe_secret_key_enc is 'Zaszyfrowany klucz prywatny Stripe (sk_live_...) — serwer-only';
comment on column public.projects.stripe_webhook_secret is 'Signing secret webhooka Stripe dla tego projektu';
