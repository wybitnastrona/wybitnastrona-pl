"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, LogOut, Menu, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth/auth-provider";

const PUBLIC_LINKS = [
  { label: "Showcase", href: "/#showcase" },
  { label: "Jak to dziala", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
];

export function Navbar() {
  const { user, loading, signOut, openAuth } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-beige/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
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
            <UserMenu email={user.email ?? ""} onSignOut={signOut} />
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => openAuth({ mode: "login" })}
                className="text-beige/90 hover:bg-white/5 hover:text-beige"
              >
                Sign In
              </Button>
              <Button
                onClick={() => openAuth({ mode: "signup" })}
                className="bg-beige text-beige-foreground hover:bg-beige/90"
              >
                Get Started
              </Button>
            </>
          )}
        </nav>

        <button
          type="button"
          aria-label="Otwórz menu"
          onClick={() => setMobileOpen((value) => !value)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-beige/20 text-beige sm:hidden"
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
                <>
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    {user.email}
                  </p>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground/80 hover:bg-white/5 hover:text-beige"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <Button
                    variant="ghost"
                    className="justify-start text-beige hover:bg-white/5"
                    onClick={() => {
                      setMobileOpen(false);
                      void signOut();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Wyloguj się
                  </Button>
                </>
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
                    Sign In
                  </Button>
                  <Button
                    onClick={() => {
                      setMobileOpen(false);
                      openAuth({ mode: "signup" });
                    }}
                    className="bg-beige text-beige-foreground hover:bg-beige/90"
                  >
                    Get Started
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

function UserMenu({
  email,
  onSignOut,
}: {
  email: string;
  onSignOut: () => Promise<void>;
}) {
  const router = useRouter();
  const initial = email?.[0]?.toUpperCase() ?? "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-9 items-center gap-2 rounded-full border border-beige/20 bg-card px-2 pr-3 text-sm text-foreground transition hover:border-beige/40">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-beige text-beige-foreground text-xs font-medium">
          {initial}
        </span>
        <span className="hidden max-w-[140px] truncate text-muted-foreground md:inline">
          {email}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-beige/20">
        <DropdownMenuLabel className="text-muted-foreground">
          Konto
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-beige/10" />
        <DropdownMenuItem disabled className="text-muted-foreground">
          <UserIcon className="h-4 w-4" />
          {email}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-beige/10" />
        <DropdownMenuItem onClick={() => router.push("/dashboard")}>
          <LayoutGrid className="h-4 w-4" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-beige/10" />
        <DropdownMenuItem onClick={() => void onSignOut()}>
          <LogOut className="h-4 w-4" />
          Wyloguj się
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
