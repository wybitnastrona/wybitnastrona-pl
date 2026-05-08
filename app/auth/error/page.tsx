import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <h1 className="text-3xl md:text-4xl font-medium tracking-tight">
          Coś poszło nie tak
        </h1>
        <p className="text-muted-foreground">
          Nie udało się dokończyć logowania. Spróbuj ponownie lub wróć na stronę
          główną.
        </p>
        <Link
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-beige px-4 text-sm font-medium text-beige-foreground transition hover:bg-beige/90"
        >
          Wróć do strony głównej
        </Link>
      </div>
    </div>
  );
}
