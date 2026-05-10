import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/navbar";

export const metadata = {
  title: "Płatność udana - wybitnastrona.pl",
};

export default function BillingSuccessPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-emerald-500/20 bg-card/40 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-medium tracking-tight">
            Płatność zakończona pomyślnie
          </h1>
          <p className="text-sm text-muted-foreground">
            Punkty zostały dodane do Twojego konta. Zaczekaj kilka sekund — synchronizacja
            sesji może zająć chwilę.
          </p>
          <Link
            href="/"
            className="mt-2 inline-flex h-10 items-center justify-center rounded-lg bg-beige px-5 text-sm font-medium text-beige-foreground transition hover:bg-beige/90"
          >
            Wróć do projektów
          </Link>
        </div>
      </main>
    </>
  );
}
