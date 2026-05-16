"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Loader2, Mail } from "lucide-react";

type Props = {
  initialEmail?: string;
};

/**
 * Formularz "Wyslij ponownie link potwierdzajacy" - uzywany na stronach
 * /auth/error i /signin. Wywoluje supabase.auth.resend({type:'signup'}).
 */
export function ResendConfirmationForm({ initialEmail = "" }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);
    if (!email) return;

    setLoading(true);
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        setError("Brak konfiguracji Supabase.");
        return;
      }
      const supabase = createBrowserClient(url, key);
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (resendError) {
        setError(resendError.message);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nieznany błąd.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-lg border border-beige/15 bg-card/40 p-4 text-left"
    >
      <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
        Wyślij ponownie link potwierdzający
      </label>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-beige/15 bg-background/40 px-2.5">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="twoj@email.pl"
            className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            required
            disabled={loading || sent}
          />
        </div>
        <button
          type="submit"
          disabled={loading || sent || !email}
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-beige px-3 text-xs font-medium text-beige-foreground transition hover:bg-beige/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Wyślij"}
        </button>
      </div>
      {sent && (
        <p className="mt-2 text-xs text-emerald-300/90">
          Wysłano! Sprawdź swoją skrzynkę odbiorczą (i folder Spam).
        </p>
      )}
      {error && <p className="mt-2 text-xs text-rose-300/90">{error}</p>}
    </form>
  );
}
