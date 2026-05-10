"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { GoogleButton } from "@/components/auth/google-button";

type AuthMode = "login" | "signup";

type AuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
};

export function AuthModal({
  open,
  onOpenChange,
  mode,
  onModeChange,
}: AuthModalProps) {
  const [emailMode, setEmailMode] = useState(false);

  function handleClose() {
    onOpenChange(false);
    setEmailMode(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden border-0 bg-transparent p-0 shadow-2xl sm:max-w-[400px]">
        <div className="relative rounded-2xl border border-white/10 bg-[#111110] p-8 shadow-2xl">
          {/* Subtle radial glow */}
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(232,220,196,0.06),transparent)]" />

          {/* Logo */}
          <div className="mb-6 flex flex-col items-center gap-1 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-beige text-beige-foreground text-lg font-bold">
              W
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Zacznij budować.
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Zaloguj się na swoje konto"
                : "Stwórz darmowe konto"}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {/* Google — always visible and prominent */}
            <GoogleButton label="Kontynuuj z Google" />

            {!emailMode && (
              <>
                <div className="relative">
                  <Separator className="bg-white/10" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#111110] px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    lub
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setEmailMode(true)}
                  className="h-10 w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 text-sm text-foreground transition hover:bg-white/10"
                >
                  Kontynuuj z adresem e-mail
                </button>
              </>
            )}

            {emailMode && (
              <>
                <div className="relative">
                  <Separator className="bg-white/10" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#111110] px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    lub e-mail
                  </span>
                </div>

                {mode === "login" ? (
                  <LoginForm onSuccess={handleClose} />
                ) : (
                  <SignupForm onSuccess={handleClose} />
                )}
              </>
            )}
          </div>

          {/* Switch mode */}
          <p className="mt-5 text-center text-xs text-muted-foreground">
            {mode === "login" ? (
              <>
                Nie masz konta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    onModeChange("signup");
                    setEmailMode(false);
                  }}
                  className="cursor-pointer text-beige underline-offset-2 hover:underline"
                >
                  Zarejestruj się
                </button>
              </>
            ) : (
              <>
                Masz już konto?{" "}
                <button
                  type="button"
                  onClick={() => {
                    onModeChange("login");
                    setEmailMode(false);
                  }}
                  className="cursor-pointer text-beige underline-offset-2 hover:underline"
                >
                  Zaloguj się
                </button>
              </>
            )}
          </p>

          <p className="mt-3 text-center text-[10px] text-muted-foreground/60">
            Kontynuując, akceptujesz{" "}
            <a href="/regulamin" className="underline-offset-2 hover:underline">
              Regulamin
            </a>{" "}
            i{" "}
            <a href="/prywatnosc" className="underline-offset-2 hover:underline">
              Politykę prywatności
            </a>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
