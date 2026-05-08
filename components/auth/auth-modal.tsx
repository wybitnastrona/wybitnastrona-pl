"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-beige/20 sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl tracking-tight">
            {mode === "login" ? "Witaj z powrotem" : "Stwórz konto"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {mode === "login"
              ? "Zaloguj się, aby kontynuować budowanie wybitnych stron."
              : "Załóż konto i zacznij generować strony w kilka sekund."}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(value) => onModeChange(value as AuthMode)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 bg-secondary">
            <TabsTrigger value="login">Logowanie</TabsTrigger>
            <TabsTrigger value="signup">Rejestracja</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="flex flex-col gap-4 pt-4">
            <GoogleButton />
            <div className="relative">
              <Separator className="bg-beige/15" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs uppercase tracking-wider text-muted-foreground">
                lub
              </span>
            </div>
            <LoginForm onSuccess={() => onOpenChange(false)} />
          </TabsContent>

          <TabsContent value="signup" className="flex flex-col gap-4 pt-4">
            <GoogleButton />
            <div className="relative">
              <Separator className="bg-beige/15" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs uppercase tracking-wider text-muted-foreground">
                lub
              </span>
            </div>
            <SignupForm onSuccess={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
