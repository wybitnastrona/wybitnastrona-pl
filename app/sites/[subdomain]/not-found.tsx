import Link from "next/link";

export default function SiteNotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="rounded-full border border-beige/20 bg-card/60 px-3 py-1 text-xs uppercase tracking-wider text-beige/80">
          404
        </span>
        <h1 className="text-3xl font-medium tracking-tight">
          Strona pod ta subdomena nie istnieje
        </h1>
        <p className="text-muted-foreground">
          Mozliwe ze projekt zostal usuniety albo wycofany. Wybierz inny adres
          lub zbuduj nowa strone.
        </p>
        <Link
          href="https://wybitnastrona.pl"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-beige px-4 text-sm font-medium text-beige-foreground transition hover:bg-beige/90"
        >
          Wroc na wybitnastrona.pl
        </Link>
      </div>
    </div>
  );
}
