/**
 * Lekki in-memory rate limiter używany przez nasze API routes.
 *
 * Każda instancja serverless function ma własną mapę liczników - to
 * NIE jest globalny rate limit, ale wystarczy do obrony przed prostym
 * floodingiem z jednego klienta (botem przeglądającym domeny, formularze).
 *
 * Mapa jest okresowo czyszczona w trakcie wywołania (lazy cleanup), żeby
 * pamięć nie rosła bez końca.
 *
 * Dla pełnoprawnego limita między instancjami użyj Upstash Redis przez
 * `@upstash/ratelimit` (zostawiamy jako możliwość rozszerzenia).
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

/**
 * Sprawdza i odejmuje token z kubełka dla danego klucza.
 *
 * @param key unikalny identyfikator (np. `formsubmit:1.2.3.4:projectId`).
 * @param max maksymalna liczba żądań w oknie.
 * @param windowMs okno czasowe w ms.
 * @returns { allowed, retryAfterSeconds } - allowed=false gdy limit przekroczony.
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  const now = Date.now();

  // Lazy cleanup co ~1000 wywołań, żeby mapa nie rosła w nieskończoność.
  if (buckets.size > 1000 && Math.random() < 0.01) {
    for (const [k, b] of buckets) {
      if (b.resetAt < now) buckets.delete(k);
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0, remaining: max - 1 };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
      remaining: 0,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: max - existing.count,
  };
}

/** Wyciąga rzeczywisty IP klienta zza proxy (Vercel / Cloudflare). */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const first = xff.split(",")[0]?.trim();
  if (first) return first;
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
