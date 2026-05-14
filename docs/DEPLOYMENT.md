# wybitnastrona.pl - kompletny setup wdrozenia

Ten dokument prowadzi krok po kroku od pustego repo do dzialajacej platformy
z generatorem AI, publikacja na `wybitny.website` i wlasna domena.

## 1. Domeny i hosting (Vercel)

W panelu Vercel projektu **wybitnastrona-pl** dodaj wszystkie ponizsze domeny:

| Domena | Rekord DNS | Cel |
| --- | --- | --- |
| `wybitnastrona.pl` | `A` -> `76.76.21.21` | Aplikacja glowna |
| `www.wybitnastrona.pl` | `CNAME` -> `cname.vercel-dns.com` | Redirect na apex |
| `wybitny.website` | `A` -> `76.76.21.21` | Domena dla opublikowanych stron |
| `*.wybitny.website` | `CNAME` -> `cname.vercel-dns.com` | Subdomeny `{slug}.wybitny.website` |

Po dodaniu wildcard `*.wybitny.website` **Vercel zazada potwierdzenia
wlasnosci** - zwykle wymaga dodatkowego rekordu TXT lub upgrade'u planu (na
darmowym planie wildcard nie zawsze dziala).

**WAZNE:** ten sam projekt Vercel obsluguje wszystkie te hosty. `middleware.ts`
rozpoznaje subdomene / domeny wlasne i przekierowuje (rewrite) do `app/sites/[subdomain]`.

## 2. Zmienne srodowiskowe (Vercel + .env.local)

```env
# Supabase (z Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Anthropic Claude (API key z console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-...

# URL aplikacji glownej
NEXT_PUBLIC_APP_URL=https://wybitnastrona.pl
NEXT_PUBLIC_ROOT_DOMAIN=wybitnastrona.pl

# Domena publikowanych stron (jak bolt.host)
NEXT_PUBLIC_PUBLISH_DOMAIN=wybitny.website

# Partner do zakupu domen (link otwiera nowa karte)
NEXT_PUBLIC_DOMAIN_PARTNER_URL=https://www.home.pl/

# (Opcjonalne) Wlasny model Wybit
# Jezeli ustawisz, generator bedzie mogl wywolywac wlasny endpoint.
# Patrz: docs/WYBIT_MODEL.md
WYBIT_MODEL_API=
WYBIT_MODEL_KEY=
```

W panelu Vercel: **Project Settings -> Environment Variables**. Po dodaniu
zrob nowy deployment.

## 3. Baza danych (Supabase)

### 3.1. Stworz projekt
1. Wejdz na [supabase.com](https://supabase.com), zaloz nowy projekt.
2. Skopiuj `Project URL` i `anon key` do zmiennych powyzej.
3. Wybierz region najblizej Polski (frankfurt lub ireland).

### 3.2. Uruchom migracje SQL
W panelu Supabase otworz **SQL Editor** i uruchom kolejno:

**Migracja 0001 - tabela projektow:**

```sql
-- supabase/migrations/0001_projects.sql
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text unique,
  title text not null default 'Untitled project',
  prompt text not null,
  files jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists projects_slug_idx on public.projects(slug)
  where slug is not null;

alter table public.projects enable row level security;

create policy "owner_all" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "public_read_published" on public.projects
  for select using (is_public = true);

create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();
```

**Migracja 0002 - wlasna domena:**

```sql
-- supabase/migrations/0002_custom_domain.sql
alter table public.projects
  add column if not exists custom_domain text,
  add column if not exists custom_domain_verified_at timestamptz;

create unique index if not exists projects_custom_domain_unique_idx
  on public.projects(custom_domain) where custom_domain is not null;
```

**Migracja 0003 - personalizacja bazy projektu (opcjonalnie):**

```sql
-- supabase/migrations/0003_project_database.sql
alter table public.projects
  add column if not exists database_url text,
  add column if not exists database_anon_key text;
```

> Pole `database_url` / `database_anon_key` przechowuje opcjonalna konfiguracje
> Supabase **per projekt uzytkownika** (kazda wygenerowana strona moze miec
> wlasna baze).

### 3.3. Storage dla zalacznikow
W panelu Supabase **Storage** stworz bucket `chat-attachments` (private) -
uzywany przez czat do plikow przeslanych przez uzytkownika (gdy wlaczymy
prawdziwy upload zamiast base64 MVP).

### 3.4. Auth providers
W **Authentication -> Providers** wlacz:
- Email + magic link (juz wlaczone domyslnie)
- Google OAuth (zarejestruj OAuth w Google Cloud Console, wklej client id/secret)

## 4. Anthropic Claude

1. [console.anthropic.com](https://console.anthropic.com) -> API Keys -> nowy key.
2. Wgraj do `ANTHROPIC_API_KEY` (Vercel + lokalne `.env.local`).
3. W ustawieniach Anthropic ustaw rate limit na poziomie konta (zalecane:
   minimum tier 1 z platnym billingiem - inaczej generator Claude
   Sonnet / Opus zwroci 429).

## 5. Co jest dostepne w aplikacji

| Funkcja | Stan | Wymagana konfiguracja |
| --- | --- | --- |
| Generator AI (Sonnet) | dziala | `ANTHROPIC_API_KEY` |
| Generator AI (Haiku, Opus) | dziala | `ANTHROPIC_API_KEY` |
| Generator Wybit (wlasny model) | wkrotce | patrz `docs/WYBIT_MODEL.md` |
| Logowanie (email + Google) | dziala | Supabase Auth |
| Persystencja projektow | dziala | migracja 0001 |
| Publikacja `*.wybitny.website` | dziala | DNS + `NEXT_PUBLIC_PUBLISH_DOMAIN` |
| Wlasna domena projektu | dziala | migracja 0002 |
| Personalizacja bazy projektu | dziala | migracja 0003 |
| Eksport ZIP | dziala | brak |
| Sandpack preview | dziala | brak |
| Element picker | MVP | brak (overlay informacyjny) |
| Zalaczniki w czacie | MVP | base64 (do 1 MB / wiadomosc) |

## 6. Lokalna praca

```bash
git clone https://github.com/wybitnastrona/wybitnastrona-pl.git
cd wybitnastrona-pl
npm install
cp .env.local.example .env.local   # uzupelnij sekrety
npm run dev
```

Otworzy sie na [http://localhost:3000](http://localhost:3000). Subdomeny
dziala na `*.localhost` (np. `myslug.localhost:3000`) - jezeli przegladarka
nie chce dolaczac subdomeny do localhost, dodaj wpis w `C:\Windows\System32\drivers\etc\hosts`:

```
127.0.0.1   myslug.localhost
```

## 7. Najczestsze problemy

- **404 na `wybitnastrona.pl`** - sprawdz w Vercel czy Framework Preset = Next.js
  oraz czy wlasciwa galaz Git jest podlaczona.
- **Subdomena `*.wybitny.website` nie dziala** - czekaj 5 do 30 min na propagacje DNS;
  upewnij sie ze rekord wildcard `CNAME` jest dodany **u rejestratora**.
- **Generator zwraca 401** - brakuje sesji Supabase lub uzytkownik nie jest zalogowany;
  zaloguj sie ponownie.
- **Generator zwraca 429 / overload** - Anthropic zwraca rate limit; przejdz na wyzszy
  tier lub zmien model na Haiku.
- **Brak generowania plikow** - sprawdz logi serwera (`Failed to persist files`) -
  najczesciej brakuje migracji 0001.

## 8. Stripe (subskrypcje PRO ze sliderem)

Po refaktorze cennika model platnosci to JEDNA subskrypcja PRO z 8 poziomami
kredytów. Brak topupów one-time. Slider w `/pricing` mapuje wybor uzytkownika
na konkretny Stripe Price ID.

### 8.1. Stworz produkty w Stripe Dashboard

Dla **kazdego** poziomu utworz osobny Product → Recurring Price (monthly, PLN):

| ENV variable | Kredyty / mc | Cena brutto |
| --- | --- | --- |
| `STRIPE_PRICE_PRO_500` | 500 | 39 zł |
| `STRIPE_PRICE_PRO_1500` | 1500 | 79 zł |
| `STRIPE_PRICE_PRO_3000` | 3000 | 139 zł |
| `STRIPE_PRICE_PRO_6000` | 6000 | 249 zł |
| `STRIPE_PRICE_PRO_12000` | 12000 | 449 zł |
| `STRIPE_PRICE_PRO_24000` | 24000 | 799 zł |
| `STRIPE_PRICE_PRO_48000` | 48000 | 1499 zł |
| `STRIPE_PRICE_PRO_96000` | 96000 | 2799 zł |

Po utworzeniu Price w Stripe Dashboard, dodaj `price_xxx` ID do Vercel env vars.

### 8.2. Webhook Stripe

1. Dashboard → Developers → Webhooks → **Add endpoint**
2. URL: `https://wybitnastrona.pl/api/stripe/webhook`
3. Eventy:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
4. Skopiuj **Signing secret** do `STRIPE_WEBHOOK_SECRET`.

### 8.3. ENV vars

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_500=price_...
STRIPE_PRICE_PRO_1500=price_...
# ...wszystkie 8
```

### 8.4. Anty-abuse (revert custom slug)

Webhook `customer.subscription.deleted` automatycznie wywołuje
`revertCustomSlugsForUser` — wszystkie custom subdomeny usera (>2 znaki, nie
auto-slug nanoid) są cofane do auto-generated, a poprzedni slug ląduje w
kolumnie `projects.custom_slug_archived` (dla potencjalnej reaktywacji).

## 9. MCP Integracje (Supabase / Notion / Memory / Stitch)

Tabela `user_integrations` (migracja 0036) przechowuje konfiguracje per user.
UI w **Integracje** dropdown w CreationHero ORAZ w workspace projektu.

| Provider | Status | Pola wymagane | Auto-config |
| --- | --- | --- | --- |
| Supabase | gotowe | `url`, `anon_key`, opcjonalnie `service_role_key` | tak — gdy user wkleil keys, AI dostaje hint w system promptcie i moze generowac /src/lib/supabase.ts |
| Notion | gotowe | `integration_token`, opcjonalnie `database_id` | tak — AI moze proponowac fetch z Notion API |
| Memory MCP | UI gotowe, runtime stub | (placeholder) | nie |
| Stitch MCP | UI gotowe, runtime stub | (placeholder) | nie |

### Auto-config Supabase
Jezeli user wkleil **service_role_key**, backend moze w przyszlosci (TODO v3)
automatycznie tworzyc migracje per-project. MVP: AI dostaje sekrety w
`buildIntegrationsPromptSection` i wpisuje je do `.env` wygenerowanej strony.

### Stripe auto-config
Stripe nie pozwala na full auto-config kont (kazdy musi sam zarejestrowac).
MVP: w workspace projektu user wkleja `STRIPE_SECRET_KEY` jako env var dla
wygenerowanej strony. AI generuje wtedy `/api/checkout/route.ts` z poprawnym
template'em.

## 10. Migracje wymagane dla refaktoru Bolt-style v2

Uruchom kolejno (od ostatniej istniejacej w panelu Supabase):

```sql
-- 0032: live preview HTML snapshot column
-- 0033: drop wybitny tier (constraint to free/pro)
-- 0034: profiles.daily_credits_used + bump_usage_counters RPC
-- 0035: projects.custom_slug_archived
-- 0036: user_integrations table
-- 0037: referrals table + profiles.referral_code + ensure_referral_code RPC
```

Wszystkie pliki w `supabase/migrations/` mozesz wkleic do SQL Editor w
Supabase Dashboard.

## 11. Limity FREE

W kodzie (`lib/ai-models.ts`):
- `monthlyCredits: 100` (max 1 generacja Sonnet 4.6 lub 3 Haiku/mc)
- `dailyCredits: 30` (max 1 Haiku/dzien)

Liczniki resetuja sie atomowo w RPC `bump_usage_counters` (24h dla daily, 30d
dla monthly). Webhook `invoice.paid` resetuje liczniki na 0 przy odnowieniu
subskrypcji PRO.

## 12. Program polecen

- Tabela `referrals` (migracja 0037).
- `profiles.referral_code` (lazy generated przez RPC `ensure_referral_code`).
- Link `/r/{code}` ustawia cookie `wybitna_ref` na 30 dni.
- Przy rejestracji `attachReferralIfPresent` w `auth/callback/route.ts`
  wpisuje referee do tabeli.
- Po pierwszej platnosci referee, webhook `invoice.paid` →
  `maybeAwardReferralReward` → `add_points(referrer, 300)`.
- UI w **Settings → Kredyty** pokazuje link i historie polecen.
