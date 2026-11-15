import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function recruiterAuthState() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { user: null, mfaPending: false };
  const store = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values: { name: string; value: string; options: CookieOptions }[]) {
        try { for (const { name, value, options } of values) store.set(name, value, options); }
        catch { /* A Server Component cannot write refresh cookies. */ }
      },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { user: null, mfaPending: false };
  const level = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (level.error) return { user: null, mfaPending: false };
  return {
    user: data.user,
    mfaPending: level.data.nextLevel === "aal2" && level.data.currentLevel !== "aal2",
  };
}

/** Candidate/search/settings APIs must not serve MFA-pending sessions. */
export async function recruiter() {
  const state = await recruiterAuthState();
  return state.mfaPending ? null : state.user;
}
