"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { UserMenu } from "@/components/user-menu";
import { PointsBadge } from "@/components/points-badge";

const PUBLIC_LINKS = [
  { label: "Szablony", href: "/templates" },
  { label: "Showcase", href: "/showcase" },
  { label: "Jak to dziala", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
];

export function Navbar() {
  const { user, loading, openAuth } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-beige/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="text-lg font-medium tracking-tight text-beige">
            wybitnastrona<span className="text-beige/60">.pl</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {PUBLIC_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm text-foreground/70 transition hover:bg-white/5 hover:text-beige"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <nav className="hidden items-center gap-2 sm:flex">
          {loading ? (
            <div className="h-9 w-32 animate-pulse rounded-md bg-card" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <PointsBadge />
              <UserMenu />
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => openAuth({ mode: "login" })}
                className="text-beige/90 hover:bg-white/5 hover:text-beige"
              >
                Zaloguj sie
              </Button>
              <Button
                onClick={() => openAuth({ mode: "signup" })}
                className="bg-beige text-beige-foreground hover:bg-beige/90"
              >
                Zacznij za darmo
              </Button>
            </>
          )}
        </nav>

        <button
          type="button"
          aria-label="Otworz menu"
          onClick={() => setMobileOpen((value) => !value)}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-beige/20 text-beige sm:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-beige/10 bg-background sm:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3">
            {PUBLIC_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-2 py-2 text-sm text-foreground/80 hover:bg-white/5 hover:text-beige"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-beige/10 pt-2">
              {user ? (
                <div className="flex items-center gap-2 px-2">
                  <PointsBadge />
                  <UserMenu />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMobileOpen(false);
                      openAuth({ mode: "login" });
                    }}
                    className="justify-start text-beige hover:bg-white/5"
                  >
                    Zaloguj sie
                  </Button>
                  <Button
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
          </div>
        </div>
      )}
    </header>
  );
}
