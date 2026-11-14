import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function recruiter() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
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
  return error ? null : data.user;
}
