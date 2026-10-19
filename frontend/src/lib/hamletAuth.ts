import type { User } from "@supabase/supabase-js";

const STORAGE_KEY = "hamlet_auth_session";

export type HamletUser = {
  id: string;
  username: string;
  email: string;
  name: string;
};

export type HamletSession = {
  token: string;
  user: HamletUser;
};

export function readHamletSession(): HamletSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as HamletSession;
    if (!parsed?.token || !parsed.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveHamletSession(session: HamletSession) {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearHamletSession() {
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function hamletSessionToken(): string | null {
  return readHamletSession()?.token ?? null;
}

export function userFromHamletSession(session: HamletSession): User {
  return {
    id: session.user.id,
    aud: "authenticated",
    email: session.user.email,
    app_metadata: {},
    user_metadata: {
      full_name: session.user.name,
      name: session.user.name,
      username: session.user.username,
    },
    created_at: new Date(0).toISOString(),
  } as User;
}
