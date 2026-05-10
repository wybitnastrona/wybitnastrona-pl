-- Idempotency dla webhook Stripe.
-- Kazde event_id zapisujemy tu. UNIQUE pozwala wykryc retry/duplikaty.

create table if not exists public.stripe_events (
  event_id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

create index if not exists stripe_events_received_at_idx
  on public.stripe_events (received_at desc);

-- RLS: tylko service role moze pisac/czytac (webhook) — wylaczamy RLS w ogole.
alter table public.stripe_events disable row level security;
