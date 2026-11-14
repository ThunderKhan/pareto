import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function safeNext(next: string | null) {
  return next && (next === "/dashboard" || next.startsWith("/dashboard/")) ? next : "/dashboard";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const destination = safeNext(url.searchParams.get("next"));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!code || !supabaseUrl || !supabaseKey) return NextResponse.redirect(new URL("/login?error=callback", url.origin));

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(toSet: { name: string; value: string; options: CookieOptions }[]) {
        toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(error ? "/login?error=callback" : destination, url.origin));
}
