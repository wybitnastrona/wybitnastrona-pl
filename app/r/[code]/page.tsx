import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type Params = { params: Promise<{ code: string }> };

/**
 * /r/[code] - landing dla linku polecajacego.
 * Ustawia cookie `wybitna_ref=<code>` na 30 dni i redirectuje na home.
 * Cookie zostanie odczytane przy rejestracji (signup-form) i zapisane w
 * tabeli `referrals` po utworzeniu profilu nowego usera.
 */
export default async function ReferralPage({ params }: Params) {
  const { code } = await params;
  const safeCode = (code ?? "")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 32);

  if (!safeCode) {
    redirect("/");
  }

  const cookieStore = await cookies();
  cookieStore.set("wybitna_ref", safeCode, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  redirect("/");
}
