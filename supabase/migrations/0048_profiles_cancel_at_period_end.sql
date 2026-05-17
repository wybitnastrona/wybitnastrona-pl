-- 0048_profiles_cancel_at_period_end.sql
--
-- Dodaje boolean `stripe_cancel_at_period_end` do profiles.
-- Webhook Stripe ustawia go gdy user anuluje subskrypcję bez immediate cancel
-- (Stripe płaci za pozostały okres). UI pokazuje banner karencji
-- na podstawie tej flagi (item 21 audytu produkcji).

alter table public.profiles
  add column if not exists stripe_cancel_at_period_end boolean not null default false;

comment on column public.profiles.stripe_cancel_at_period_end is
  'TRUE gdy user anulował subskrypcję PRO, ale wciąż jest w opłaconym okresie. '
  'Aktualizowane przez webhook /api/stripe/webhook (customer.subscription.updated). '
  'UI w pricing-client pokazuje wtedy informację o karencji (item 21 audytu).';
