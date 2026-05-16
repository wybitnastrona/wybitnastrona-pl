import Link from "next/link";
import { ResendConfirmationForm } from "@/components/auth/resend-confirmation-form";

type SearchParams = {
  message?: string;
  email?: string;
};

function hintForError(msg: string): string | null {
  const lower = msg.toLowerCase();
  if (lower.includes("expired") || lower.includes("wygas")) {
    return "Link potwierdzający wygasł. Wyślij ponownie poniżej.";
  }
  if (lower.includes("already") || lower.includes("uzyt")) {
    return "Adres e-mail jest już potwierdzony - zaloguj się.";
  }
  if (
    lower.includes("invalid") ||
    lower.includes("token") ||
    lower.includes("nieprawid")
  ) {
    return "Link jest nieprawidłowy lub został już raz użyty. Wyślij nowy link poniżej.";
  }
  return null;
}

export default async function AuthErrorPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await props.searchParams;
  const message = sp?.message?.trim();
  const prefillEmail = sp?.email?.trim();
  const hint = message ? hintForError(message) : null;

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
          Coś poszło nie tak
        </h1>
        <p className="text-muted-foreground">
          Nie udało się dokończyć logowania ani potwierdzenia adresu e-mail.
        </p>

        {message && (
          <div className="w-full rounded-lg border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-left text-xs leading-relaxed text-rose-100">
            <div className="mb-1 font-semibold uppercase tracking-wider text-rose-200/80">
              Szczegóły
            </div>
            <code className="break-words font-mono">{message}</code>
            {hint && (
              <p className="mt-2 text-[11px] text-rose-100/90">{hint}</p>
            )}
          </div>
        )}

        <ResendConfirmationForm initialEmail={prefillEmail ?? ""} />

        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-beige px-4 text-sm font-medium text-beige-foreground transition hover:bg-beige/90"
          >
            Wróć do strony głównej
          </Link>
          <Link
            href="/signin"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-beige/30 px-4 text-sm font-medium text-foreground transition hover:border-beige/50 hover:bg-white/5"
          >
            Zaloguj się
          </Link>
        </div>
      </div>
    </div>
  );
}
