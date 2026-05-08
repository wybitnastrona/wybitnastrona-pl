"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { AuthModal } from "@/components/auth/auth-modal";

type AuthMode = "login" | "signup";

type OpenAuthOptions = {
  mode?: AuthMode;
  onSuccess?: () => void;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  openAuth: (options?: OpenAuthOptions) => void;
  closeAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const pendingActionRef = useRef<(() => void) | null>(null);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        setLoading(false);
        if (nextUser) {
          setAuthOpen(false);
          const action = pendingActionRef.current;
          pendingActionRef.current = null;
          if (action) {
            action();
          }
        }
      },
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  const openAuth = useCallback((options?: OpenAuthOptions) => {
    setAuthMode(options?.mode ?? "login");
    pendingActionRef.current = options?.onSuccess ?? null;
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    pendingActionRef.current = null;
    setAuthOpen(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signOut, openAuth, closeAuth }),
    [user, loading, signOut, openAuth, closeAuth],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal
        open={authOpen}
        onOpenChange={(open) => {
          if (!open) {
            pendingActionRef.current = null;
          }
          setAuthOpen(open);
        }}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
