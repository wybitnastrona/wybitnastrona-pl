-- Plan subskrypcji wycofany — model biznesowy oparty wylacznie o kredyty (points).
-- Modele AI roznia sie cena w kredytach (pointCost w lib/ai-models.ts).
-- Kolumny subscription_tier / subscription_status / subscription_expires_at
-- rowniez nie sa juz uzywane (Stripe przeszedl na one-time top-up).
alter table public.profiles
  drop column if exists plan,
  drop column if exists subscription_tier,
  drop column if exists subscription_status,
  drop column if exists subscription_expires_at;
