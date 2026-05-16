"use client";

/**
 * SideNav — staly lewy sidebar dla publicznych podstron wybitnastrona.pl.
 *
 * Zastapuje gorny `<Navbar>` (sticky header). Na desktopie (>= md) zajmuje
 * 224px szerokosci (w-56) po lewej, na mobile zwijany do top-bar +
 * portalowanego drawer-a.
 *
 * Strony konsumenckie nie musza dodawac `pl-56` manualnie — komponent w
 * `useEffect` ustawia `document.body.style.paddingLeft` na medium+ szerokosciach
 * i zdejmuje przy unmount.
 */

import Link from "next/link";
import { createPortal } from "react-dom";
import { Menu, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { UserMenu } from "@/components/user-menu";
import { PointsBadge } from "@/components/points-badge";

// Lista linkow publicznych (bez Showcase — usuniete w Task 13).
const PUBLIC_LINKS: { label: string; href: string }[] = [
  { label: "Szablony", href: "/templates" },
  { label: "Jak to dziala", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
  { label: "Dokumentacja", href: "/docs" },
];

const SIDEBAR_WIDTH_PX = 224; // tailwind w-56 = 14rem

export function SideNav() {
  const { user, loading, openAuth } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Push body content right na desktopie. Sidebar jest `fixed`, wiec inaczej
  // by sie nakladal na strony konsumenckie.
  useEffect(() => {
    function applyPadding() {
      if (window.innerWidth >= 768) {
        document.body.style.paddingLeft = `${SIDEBAR_WIDTH_PX}px`;
      } else {
        document.body.style.paddingLeft = "";
      }
    }
    applyPadding();
    window.addEventListener("resize", applyPadding);
    return () => {
      window.removeEventListener("resize", applyPadding);
      document.body.style.paddingLeft = "";
    };
  }, []);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="fixed left-0 top-0 z-30 hidden h-screen w-56 flex-col border-r border-beige/10 bg-background/95 backdrop-blur-md md:flex"
        style={{ width: SIDEBAR_WIDTH_PX }}
      >
        <div className="flex h-16 shrink-0 items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-medium tracking-tight text-beige">
              wybitnastrona<span className="text-beige/60">.pl</span>
            </span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
          {PUBLIC_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-foreground/70 transition hover:bg-white/5 hover:text-beige"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {/* Pasek kredytow — psychologia "popycha" do upgrade gdy zaczyna sie
            robic czerwony. Pokazujemy tylko gdy user zalogowany (FREE i PRO). */}
        {user && <CreditBar />}
        <div className="shrink-0 border-t border-beige/10 p-3">
          {loading ? (
            <div className="h-9 w-full animate-pulse rounded-md bg-card" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <PointsBadge />
              <UserMenu />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openAuth({ mode: "login" })}
                className="justify-start text-beige/90 hover:bg-white/5 hover:text-beige"
              >
                Zaloguj sie
              </Button>
              <Button
                size="sm"
                onClick={() => openAuth({ mode: "signup" })}
                className="bg-beige text-beige-foreground hover:bg-beige/90"
              >
                Zacznij za darmo
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile top header */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between gap-3 border-b border-beige/10 bg-background/95 px-4 backdrop-blur-md md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-base font-medium tracking-tight text-beige">
            wybitnastrona<span className="text-beige/60">.pl</span>
          </span>
        </Link>
        <button
          type="button"
          aria-label="Otworz menu"
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-beige/20 text-beige"
        >
          <Menu className="h-4 w-4" />
        </button>
      </header>

      {/* Mobile drawer via portal — wynosimy z header stacking contextu zeby
          backdrop-blur na headerze nie tlumil drawera. */}
      {mounted &&
        mobileOpen &&
        createPortal(
          <div className="fixed inset-0 z-[200] md:hidden">
            <button
              type="button"
              aria-label="Zamknij menu"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 cursor-default bg-black/60"
            />
            <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-beige/10 bg-background shadow-2xl">
              <div className="flex h-14 shrink-0 items-center justify-between px-4">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="text-base font-medium tracking-tight text-beige"
                >
                  wybitnastrona<span className="text-beige/60">.pl</span>
                </Link>
                <button
                  type="button"
                  aria-label="Zamknij"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-beige hover:bg-white/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
                {PUBLIC_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2 text-sm text-foreground/80 hover:bg-white/5 hover:text-beige"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              {user && <CreditBar onUpgradeClick={() => setMobileOpen(false)} />}
              <div className="shrink-0 border-t border-beige/10 p-3">
                {user ? (
                  <div className="flex items-center gap-2">
                    <PointsBadge />
                    <UserMenu />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setMobileOpen(false);
                        openAuth({ mode: "login" });
                      }}
                      className="justify-start text-beige/90 hover:bg-white/5"
                    >
                      Zaloguj sie
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setMobileOpen(false);
                        openAuth({ mode: "signup" });
                      }}
                      className="bg-beige text-beige-foreground hover:bg-beige/90"
                    >
                      Zacznij za darmo
                    </Button>
                  </div>
                )}
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * CreditBar — pasek postepu zuzycia miesiecznych kredytow.
 *
 * Logika:
 *  - Fetch z `/api/me/points` (zwraca `points`, `monthlyLimit`).
 *  - `points` to BIEZACE saldo (malejace). `used = monthlyLimit - points`.
 *  - Pasek pokazuje zuzycie: szerokosc = clamp(used / limit * 100, 0..100).
 *  - Kolor: czerwony gdy zostalo < 20% kredytow (pct zuzycia > 80%),
 *    czyli moment "panicznego upgrade" — beige w pozostalych przypadkach.
 *  - Ikona Zap obok linkuje do `/pricing` (najprostsza droga do upgrade).
 *
 * Defensywnie: gdy saldo > limit (rzadkie, np. po dokupieniu pakietu), pasek
 * pozostaje pelny + zielony (kredytow jest w nadmiarze).
 */
export function CreditBar({ onUpgradeClick }: { onUpgradeClick?: () => void } = {}) {
  const [points, setPoints] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/points", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("nope"))))
      .then((data: { points?: number; monthlyLimit?: number }) => {
        if (cancelled) return;
        setPoints(data.points ?? 0);
        setLimit(data.monthlyLimit ?? 1500);
      })
      .catch(() => {
        if (!cancelled) {
          setPoints(0);
          setLimit(1500);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (points === null || limit === null || limit <= 0) {
    return (
      <div className="shrink-0 border-t border-beige/10 px-3 pb-3 pt-3">
        <div className="h-1.5 w-full animate-pulse rounded-full bg-card" />
      </div>
    );
  }

  const safeLimit = Math.max(1, limit);
  const used = Math.max(0, safeLimit - points);
  const usedPct = Math.min(100, Math.round((used / safeLimit) * 100));
  const isLow = usedPct >= 80; // pozostalo <= 20% kredytow

  return (
    <div className="shrink-0 border-t border-beige/10 px-3 pb-2 pt-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-muted-foreground">
          <span className={isLow ? "text-red-400" : "text-foreground"}>
            {points.toLocaleString("pl-PL")}
          </span>{" "}
          / {safeLimit.toLocaleString("pl-PL")} kr
        </span>
        <Link
          href="/pricing"
          onClick={onUpgradeClick}
          title="Doladuj kredyty"
          aria-label="Doladuj kredyty"
          className={`inline-flex h-5 w-5 items-center justify-center rounded-md transition ${
            isLow
              ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
              : "text-beige hover:bg-white/5"
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-card"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={usedPct}
        aria-label="Zuzyte kredyty"
      >
        <div
          className={`h-full transition-all ${
            isLow ? "bg-red-500" : "bg-beige"
          }`}
          style={{ width: `${usedPct}%` }}
        />
      </div>
    </div>
  );
}
