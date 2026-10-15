import type { User } from "@supabase/supabase-js";

const STORAGE_KEY = "local_auth_bypass";

export function canUseLocalBypass() {
  return typeof window !== "undefined";
}

export function isLocalBypassEnabled() {
  return canUseLocalBypass() && window.sessionStorage.getItem(STORAGE_KEY) === "1";
}

export function enableLocalBypass() {
  window.sessionStorage.setItem(STORAGE_KEY, "1");
}

export function clearLocalBypass() {
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function localBypassUser(): User {
  return {
    id: "dev-user",
    aud: "authenticated",
    email: "edo_hamlet@qiniq.com",
    app_metadata: {},
    user_metadata: { full_name: "David", name: "David" },
    created_at: new Date(0).toISOString(),
  } as User;
}
