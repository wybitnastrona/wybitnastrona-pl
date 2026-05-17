# Checklista przed wdrożeniem produkcyjnym

Ten dokument zawiera **wszystkie akcje po Twojej stronie** (Vercel / Stripe / Supabase / Cloudinary), które musisz wykonać przed go-live, aby 100-punktowa lista kontrolna była spełniona.

Wszystkie zmiany w kodzie zostały już zaaplikowane. Pozostałe punkty wymagają dostępu do paneli zewnętrznych usług - nie da się ich załatwić commit-em.

---

## Środowisko Vercel

### 1. Zmienne środowiskowe (Vercel → Settings → Environment Variables)

Ustaw dla wszystkich środowisk (Production, Preview, Development), chyba że zaznaczono inaczej:

| Zmienna | Wartość | Uwagi |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://wybitnastrona.pl` | Item 96 - bez tego linki Stripe / email lecą na `localhost:3000`. |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `wybitnastrona.pl` | Domena platformy. |
| `NEXT_PUBLIC_PUBLISH_DOMAIN` | `wybitny.website` | Domena subdomen klientów. |
| `NEXT_PUBLIC_SUPABASE_URL` | (z Supabase Dashboard) | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (z Supabase Dashboard) | |
| `SUPABASE_SERVICE_ROLE_KEY` | (z Supabase Dashboard - **tylko Production**) | Service role - NIGDY w Preview/Dev. |
| `STRIPE_SECRET_KEY` | `sk_live_…` w prod, `sk_test_…` w preview | |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` (z Stripe Dashboard Webhooks) | Item 23 - bez tego webhook nie zostanie zweryfikowany. |
| `ANTHROPIC_API_KEY` | (Anthropic Console) | Generowanie kodu. |
| `OPENAI_API_KEY` | (OpenAI Platform) | `generateImage` tool. |
| `PORKBUN_API_KEY` + `PORKBUN_SECRET_KEY` | (Porkbun Account → API Access) | Bez tego UI domen pokaże komunikat "tymczasowo niedostępne" (item 41). |
| `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` + `VERCEL_TEAM_ID` | (Vercel Account Settings) | Bez tego usunięcie projektu nie odłączy domeny w Vercelu (item 49). |
| `ADMIN_PASSWORD_SALT` | losowy 32-znakowy string | Item 83 - rotacja wymaga re-hashowania istniejących adminów. |
| `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` | (Cloudinary Account → API Keys) | Item 57 - bez tego dashboard pokazuje placeholder zamiast screenshotów. |
| `RESEND_API_KEY` | (Resend Dashboard) | Powiadomienia email z form-submit. |

### 2. Vercel Function Memory (Item 51)

Po pierwszym deploy `vercel.json` automatycznie ustawi:
- `app/api/projects/[id]/screenshot/route.ts`: 2 GB / 60 s
- `app/api/projects/[id]/deploy-static/route.ts`: 60 s
- `app/api/generate/route.ts`: 300 s

**Wymaga planu Vercel Pro lub Team**. W Hobby maksymalny memory to 1024 MB - screenshot z Puppeteerem prawdopodobnie wyleci OOM. Sprawdź w Vercel → Settings → Functions po deploy.

### 3. Vercel Runtime sprawdzenie (Item 10)

Po deploy otwórz `https://wybitnastrona.pl/api/me/points` w przeglądarce. Jeśli odpowiedź pojawi się pod 1s, runtime jest OK. Jeśli timeout - sprawdź czy `proxy.ts` nie ma `export const runtime = "edge"` (powinien być Node lub default).

---

## Supabase

### 4. Migracje SQL

Otwórz Supabase Dashboard → SQL Editor → New query. Wklej zawartość:

```
supabase/APPLY_IN_DASHBOARD.sql
```

…i uruchom. Zawiera wszystkie migracje 0001-0048 jako idempotentne `IF NOT EXISTS` / `drop policy if exists`. Bezpieczne do wielokrotnego uruchomienia - **nie usuwa danych** (Item 81).

Najważniejsze świeże migracje (z tego refaktoru):
- `0046` - `get_rls_audit()` RPC dla panelu Audyt Bezpieczeństwa
- `0047` - tightened `deployed-sites` bucket listing (Item 17)
- `0048` - `profiles.stripe_cancel_at_period_end` dla grace tooltip (Item 21)

### 5. Storage bucket `deployed-sites`

Migracja `0044_deployed_sites_storage.sql` tworzy bucket jako **public**. Jest to celowe i udokumentowane w komentarzu na początku pliku migracji (Item 86 ADR). Nie zmieniaj na private - złamiesz publikację stron.

### 6. Auth → URL Configuration

Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://wybitnastrona.pl`
- **Redirect URLs** (dodaj wszystkie):
  - `https://wybitnastrona.pl/auth/callback`
  - `https://wybitnastrona.pl/**`
  - `https://*.wybitny.website/**` (jeśli usery loginują się na subdomenach)
  - `http://localhost:3000/**` (dev)

---

## Stripe

### 7. Webhook endpoint

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- **Endpoint URL**: `https://wybitnastrona.pl/api/stripe/webhook`
- **Events**:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `checkout.session.completed`
  - `invoice.paid`
- Skopiuj `Signing secret` (`whsec_…`) do Vercel env jako `STRIPE_WEBHOOK_SECRET`.

### 8. Stripe Products + Prices

Sprawdź czy 8 produktów PRO z `lib/stripe-products.ts` mają poprawne `stripePriceId` w Stripe Dashboard:
- Każdy jako recurring subscription, monthly, PLN.
- Metadata `points: <liczba>` opcjonalnie (kod używa tabeli w `lib/stripe-products.ts`, nie metadata).

### 9. Customer Portal (opcjonalnie ale rekomendowane)

Stripe Dashboard → Settings → Billing → Customer portal:
- Włącz "Allow customers to cancel subscriptions"
- Skopiuj URL portala do env `STRIPE_CUSTOMER_PORTAL_URL` (jeśli używasz w UI).

---

## Cloudinary

### 10. Transformation defaults

Cloudinary domyślnie nie limituje wagi obrazków. Kod automatycznie dokleja `q_auto,f_auto,c_fill,w_640,h_400/` do URL screenshotów (Item 59). Sprawdź czy działa:

```
https://res.cloudinary.com/{CLOUD}/image/upload/q_auto,f_auto/wybitnastrona/screenshots/{projectId}.png
```

Free tier Cloudinary ma 25 GB/mc bandwidth. Przy 1000 wyświetleń dashboardu × 50 KB miniatury = 50 MB. Bezpiecznie.

### 11. Optymalizacja jakości (opcjonalnie)

Cloudinary Console → Settings → Image API → enable "Auto-format" globally → zmniejsza wagę o kolejne 20-30%.

---

## Porkbun (rejestracja domen)

### 12. Klucze API

Porkbun Account → Account → API Access → Generate API keys. Skopiuj do Vercel env. Bez kluczy: UI domen pokaże 503 z komunikatem (item 41) - to oczekiwane zachowanie. Wystarczy ustawić klucze i restart deployu.

### 13. WHOIS Privacy

Wszystkie nowe rejestracje przez API mają już ustawioną darmową `whoisPrivacy: "yes"` (item 46). Sprawdź po pierwszej rejestracji w Porkbun Dashboard → Account → Domains → wybierz domenę → WHOIS Privacy = ON.

---

## DNS + custom domeny klientów

### 14. Instrukcje dla klientów

UI w DomainsDialog mówi klientom (item 48):
- `A @ → 76.76.21.21` (apex)
- `CNAME www → cname.vercel-dns.com`

Sprawdź:
1. Czy w Vercel Project → Settings → Domains masz dodany `wybitny.website` z poprawną konfiguracją apex.
2. Czy DNS-y wybitnastrona.pl wskazują na Vercel (`vercel domains add wybitnastrona.pl`).

---

## Smoke testy (do zrobienia po deploy)

1. **Otwórz `https://wybitnastrona.pl`** - landing page renderuje się bez błędów w konsoli.
2. **Zaloguj się** - modal się otwiera, można utworzyć konto.
3. **Wygeneruj projekt** - chat odpowiada, kredyty się odejmują.
4. **Opublikuj projekt** - generuje się subdomena, otwiera się działająca strona statyczna.
5. **Sprawdź `https://{slug}.wybitny.website/manifest.json`** - powinien zwrócić clean 404 (item 2).
6. **Wpisz `https://{slug}.wybitny.website/o-nas/`** (z trailing slash) - działa tak samo jak bez (item 3).
7. **Stripe Checkout** - kliknij "Wybierz PRO" - przekierowanie do checkout.stripe.com.
8. **Anuluj subskrypcję** - banner "okres karencji" pojawia się (item 21).
9. **Form-submit z curl z wrong origin** - zwraca 403 (item 80):
   ```bash
   curl -X POST https://wybitnastrona.pl/api/form-submit?projectId=xxx \
     -H "Origin: https://evil.com" -H "Content-Type: application/json" \
     -d '{"fields":{"name":"test"}}'
   # Oczekiwane: 403 "Origin not allowed"
   ```
10. **Form-submit flood** - 6 zgłoszeń z tego samego IP w 60s → 6. dostaje 429 (item 77).
11. **iOS Safari** (real device, nie simulator) - test:
    - Element picker Escape (item 65) - klawisz Esc na klawiaturze BT cancela picker
    - CSV download (item 74) - kliknij "Eksportuj CSV", plik pobiera się i otwiera w Numbers/Excel z polskimi znakami.
12. **Marketing audit** (item 100) - zrób grep w blog postach / social media na "Bolt", "Lovable", "Rork", "Emergent" przed publikacją kampanii.

---

## Co zostało zaaplikowane w kodzie (FYI - referencyjnie)

Patrz [plan 100_point_production_hardening_58260d24.plan.md](../.cursor/plans/100_point_production_hardening_58260d24.plan.md) - 12 grouped commits, ~30 plików zmodyfikowanych:

- `proxy.ts` - trailing slash, cookies Secure+SameSite=None, COEP tylko na subdomeny
- `deploy-static/route.ts` - orphan cleanup, atomic flag, cache-control, payload size guard
- `migrations/0047` - bucket listing tightened
- `migrations/0048` - `stripe_cancel_at_period_end` column
- Stripe webhook - upsert race-safe, cancel-at-period-end tracking
- `pricing-client.tsx` - banner karencji
- `ui/tooltip.tsx` - collision padding (mobile)
- `generate/route.ts` - model tier server-check, per-step balance recheck
- `chat-panel.tsx` - hard block at 0 credits + Doładuj CTA
- Porkbun API - WHOIS privacy, rate limit, price reservation, env-missing 503
- `domains/check/route.ts` - rate limit + 503
- `domain-dialog` - syntax validation, A record DNS instructions
- `project/[id]/route.ts` - detach Vercel domain on delete
- `screenshot/route.ts` - timeout, Cloudinary fallback, empty-content guard, q_auto, /tmp cleanup
- `vercel.json` - memory profile for screenshot, deploy-static maxDuration
- `dashboard-grid.tsx` - thumbnail + placeholder fallback
- `element-picker-script.ts` - Escape forward to parent, min-size guard
- `chat-panel.tsx` - global mouseleave clear
- `form-submit/route.ts` - rate limit + CORS origin allowlist
- `pwa-register.tsx` - updateViaCache=none, hourly update check
- `lib/publish-url.ts` - VERCEL_URL fallback
- `globals.css` - forced-colors mode
- `package.json` - chromium + puppeteer-core pinned exact
- Competitor scrub - Lovable/Bolt/Rork/Emergent z komentarzy
- ADR-y w `lib/ai-models.ts`, `lib/stripe-products.ts`, migracji `0034`/`0044`

Łącznie: **80 z 100 punktów** załatwionych w kodzie. Pozostałe 20 to akcje powyżej.
