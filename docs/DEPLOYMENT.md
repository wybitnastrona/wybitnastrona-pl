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

**WAZNE:** ten sam projekt Vercel obsluguje wszystkie te hosty. `proxy.ts`
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

# Domena publikowanych stron (jak wybitny.website)
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

## 9. Cloudinary (screenshoty publikowanych stron + grafiki AI)

Cloudinary jest naszym CDN-em do dwoch rodzajow obrazow:

1. **AI-generated images** w wygenerowanych aplikacjach
   (folder `wybitnastrona/projects/{projectId}`) — uzywane przez generator
   gdy AI dolacza obrazy do strony.
2. **Screenshoty opublikowanych projektow** dla podgladu w dashboardzie
   (folder `wybitnastrona/screenshots`, `public_id = {projectId}`).
   Screenshot jest generowany **tylko raz po publikacji**
   (fire-and-forget `/api/projects/[id]/screenshot`) — `public_id` jest
   stabilny, wiec ponowna publikacja **nadpisuje** poprzedni plik (nie ma
   problemu z orphanami).

### 9.1. Zaloz konto Cloudinary

1. Zarejestruj sie na [cloudinary.com](https://cloudinary.com) (Free tier
   daje 25 GB storage i 25 GB transferu / mc — wystarczy na start).
2. Wejdz w **Dashboard → Settings → Account** i skopiuj **Cloud name**.
3. **Dashboard → API Keys** → wygeneruj nowy klucz, skopiuj `API Key`
   i `API Secret`.

### 9.2. ENV vars

```env
# Cloudinary (wymagane do publikacji + obrazow AI)
CLOUDINARY_CLOUD_NAME=     # Dashboard → Settings → Account → Cloud name
CLOUDINARY_API_KEY=        # Dashboard → API Keys
CLOUDINARY_API_SECRET=     # Dashboard → API Keys

# Alternatywa (1 zmienna zamiast 3, format z dashboard "API Environment variable"):
# CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

W panelu Vercel ustaw te zmienne w **Project Settings → Environment Variables**
dla wszystkich environments (Production / Preview / Development). Po
dodaniu wystartuj nowy deployment.

> **Bez tych zmiennych**: endpoint `/api/projects/[id]/screenshot` zwroci
> 503, a screenshot po publikacji nie zostanie wygenerowany (dashboard
> pokaze fallback iframe / pusta karta). Aplikacja jako calosc bedzie
> nadal dzialala — to nie blokujaca zaleznosc.

### 9.3. Powiazane pliki w kodzie

- `lib/cloudinary.ts` — `uploadImageToCloudinary(url, projectId)` oraz
  `uploadBufferToCloudinary(buffer, projectId)` (PNG z Puppeteera).
- `app/api/projects/[id]/screenshot/route.ts` — Puppeteer + upload.
- `app/api/projects/[id]/publish/route.ts` — fire-and-forget wywoluje
  screenshot po udanej publikacji.
- `projects.preview_image_url` (migracja 0041) — przechowuje wynikowy URL
  Cloudinary; dashboard czyta to pole bez ponownego generowania.

## 10. MCP Integracje (Supabase / Notion / Memory / Stitch)

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

## 11. Migracje wymagane dla refaktoru wybitnastrona.pl v2

Uruchom kolejno (od ostatniej istniejacej w panelu Supabase):

```sql
-- 0032: live preview HTML snapshot column
-- 0033: drop wybitny tier (constraint to free/pro)
-- 0034: profiles.daily_credits_used + bump_usage_counters RPC
-- 0035: projects.custom_slug_archived
-- 0036: user_integrations table
-- 0037: referrals table + profiles.referral_code + ensure_referral_code RPC
-- 0038: projects.app_db_enabled (per-projekt baza wspoldzielona)
-- 0039: user_integrations OAuth tokens
-- 0040: get_project_stats_v2 (analityka z konfigurowalnym bucketem)
-- 0041: projects.preview_image_url (Cloudinary URL screenshotu)
-- 0042: profiles.monthly_credits_limit (pasek postepu w SideNav)
```

Wszystkie pliki w `supabase/migrations/` mozesz wkleic do SQL Editor w
Supabase Dashboard.

## 12. Storage: statyczne buildy projektów

Po kliknięciu **Publikuj** (gdy projekt jest otwarty w edytorze z WebContainerem),
platforma automatycznie:

1. Uruchamia `npm run build` wewnątrz WebContainera.
2. Wczytuje pliki z katalogu `dist/` (lub `build/`, `out/`).
3. Uploaduje je do Supabase Storage (`deployed-sites/{projectId}/…`).

Bucket **`deployed-sites`** musi być utworzony przed pierwszym deployem.
Najprościej: uruchom migację `0044` (jest w `supabase/APPLY_IN_DASHBOARD.sql`).

`proxy.ts` (Edge) serwuje te pliki bezpośrednio z bucketa z nagłówkami COOP/COEP,
zamiast ładować Sandpack w przeglądarce. Sandpack pozostaje jako fallback gdy
statyczny build nie jest jeszcze dostępny.

Jeśli projekt nie ma skryptu `build` w `package.json` (np. projekty czysto
Sandpackowe), deploy statyczny nie zostanie uruchomiony — Sandpack obsługuje
publikację tak jak wcześniej.

Bucket nie wymaga żadnych dodatkowych zmiennych środowiskowych — używa tych
samych kluczy Supabase co reszta aplikacji.

## 13. Limity FREE

W kodzie (`lib/ai-models.ts`):
- `monthlyCredits: 1500`
- `dailyCredits: 800`

Liczniki resetuja sie atomowo w RPC `bump_usage_counters` (24h dla daily, 30d
dla monthly). Webhook `invoice.paid` resetuje liczniki na 0 przy odnowieniu
subskrypcji PRO. Pasek postepu w SideNav (`/api/me/points` → `monthlyLimit`)
zwraca `profiles.monthly_credits_limit` (PRO: ustawiane przez webhook
`subscription.created|updated` na `product.points`; FREE: stale 1500).

## 14. Program polecen

- Tabela `referrals` (migracja 0037).
- `profiles.referral_code` (lazy generated przez RPC `ensure_referral_code`).
- Link `/r/{code}` ustawia cookie `wybitna_ref` na 30 dni.
- Przy rejestracji `attachReferralIfPresent` w `auth/callback/route.ts`
  wpisuje referee do tabeli.
- Po pierwszej platnosci referee, webhook `invoice.paid` →
  `maybeAwardReferralReward` → `add_points(referrer, 300)`.
- UI w **Settings → Kredyty** pokazuje link i historie polecen.
