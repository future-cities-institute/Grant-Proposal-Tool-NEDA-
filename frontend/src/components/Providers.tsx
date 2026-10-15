"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { clearLocalBypass, enableLocalBypass, isLocalBypassEnabled, localBypassUser } from "@/lib/localAuth";
import { supabase } from "@/lib/supabase";
import { ToastProvider } from "@/components/ui/toast";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  startLocalSession: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  startLocalSession: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function isPublicPath(pathname: string) {
  return pathname === "/" || pathname === "/login";
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [bypassed, setBypassed] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const signedIn = Boolean(session) || bypassed;

  useEffect(() => {
    const bypass = isLocalBypassEnabled();
    setBypassed(bypass);
    let active = true;
    if (bypass) {
      setLoading(false);
    } else {
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (active) setSession(data.session);
        })
        .catch(() => {
          if (active) setSession(null);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const isPublic = isPublicPath(pathname);
    if (!signedIn && !isPublic) {
      router.replace("/login");
    }
    if (signedIn && (pathname === "/" || pathname === "/login")) {
      router.replace("/dashboard");
    }
  }, [signedIn, loading, pathname, router]);

  const signOut = async () => {
    clearLocalBypass();
    setBypassed(false);
    setSession(null);
    await supabase.auth.signOut().catch(() => undefined);
    router.replace("/login");
  };

  const startLocalSession = () => {
    enableLocalBypass();
    setBypassed(true);
  };

  const isPublic = isPublicPath(pathname);
  const waitingForRedirect =
    loading ||
    (!signedIn && !isPublic) ||
    (signedIn && (pathname === "/" || pathname === "/login"));
  const user: User | null = session?.user ?? (bypassed ? localBypassUser() : null);

  if (waitingForRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, startLocalSession }}>
      {children}
    </AuthContext.Provider>
  );
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60 * 1000 } },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthGuard>{children}</AuthGuard>
      </ToastProvider>
    </QueryClientProvider>
  );
}
