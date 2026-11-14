"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowLeft, ArrowRight, GoogleLogo, LockKey, ShieldCheck } from "@phosphor-icons/react";

type Mode = "login" | "signup";

function safeNext() {
  if (typeof window === "undefined") return "/dashboard";
  const value = new URLSearchParams(window.location.search).get("next");
  return value && (value === "/dashboard" || value.startsWith("/dashboard/")) ? value : "/dashboard";
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const isSignup = mode === "signup";
  // These are browser-safe settings injected by Next.js from frontend/.env.local.
  // Keep credentials and database URLs out of the rendered troubleshooting text.
  const missingSettings = [
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" : null,
  ].filter((value): value is string => value !== null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      if (isSignup) {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth/callback" },
        });
        if (error) throw error;
        if (data.session) window.location.assign(safeNext());
        else setMessage({ text: "Check your inbox for the verification email, if confirmation is enabled. Then return to log in.", error: false });
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign(safeNext());
      }
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Authentication could not be completed. Please try again.", error: true });
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    if (!client || busy) return;
    setBusy(true);
    setMessage(null);
    const next = safeNext();
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback?next=" + encodeURIComponent(next) },
    });
    if (error) {
      setMessage({ text: error.message, error: true });
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-shell__brand"><Link href="/" className="auth-shell__brand-link"><span className="auth-shell__brand-icon">p.</span> pareto<span>.</span></Link><Link href="/" className="auth-shell__back"><ArrowLeft size={16} /> Back to site</Link></div>
      <div className="auth-shell__content">
        <div className="auth-shell__editorial">
          <div className="eyebrow">RECRUITMENT, WITH REASONS</div>
          <h1>Better hiring begins with <em>clearer thinking.</em></h1>
          <p>Describe what you need. Confirm your criteria. Understand every match—and every unknown.</p>
          <div className="auth-shell__rule"><ShieldCheck size={19} /> Your search stays under your control.</div>
        </div>
        <div className="auth-card">
          <p className="auth-card__eyebrow">{isSignup ? "CREATE YOUR WORKSPACE" : "WELCOME BACK"}</p>
          <h2>{isSignup ? "Get started with Pareto" : "Log in to Pareto"}</h2>
          <p className="auth-card__subline">{isSignup ? "Set up an account to explore explainable candidate search." : "Access your recruitment workspace."}</p>
          {!client && (
            <div className="auth-card__notice" role="status">
              Supabase sign-in is not configured. Set <strong>{missingSettings.join(" and ")}</strong> in <code>frontend/.env.local</code> (next to the frontend package.json), then stop and restart <code>pnpm dev</code>. Database settings in <code>backend/.env</code> alone do not enable login.
            </div>
          )}
          <button className="auth-card__google" type="button" onClick={onGoogle} disabled={!client || busy}>
            <GoogleLogo size={19} weight="bold" /> Continue with Google
          </button>
          <div className="auth-card__divider"><span>or continue with email</span></div>
          <form onSubmit={onSubmit}>
            <label htmlFor="auth-email">Email address</label>
            <input id="auth-email" type="email" autoComplete="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!client || busy} />
            <label htmlFor="auth-password">Password</label>
            <input id="auth-password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={6} required placeholder={isSignup ? "Create a password" : "Enter your password"} value={password} onChange={(e) => setPassword(e.target.value)} disabled={!client || busy} />
            {!isSignup && <a className="auth-card__forgot" href="/forgot-password">Forgot your password?</a>}
            {message && <p className={"auth-card__message " + (message.error ? "auth-card__message--error" : "")} role="status">{message.text}</p>}
            <button className="button button--dark auth-card__submit" disabled={!client || busy} type="submit">
              {busy ? "Working…" : isSignup ? "Create account" : "Log in"} <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-card__switch">{isSignup ? "Already have an account?" : "New to Pareto?"} <a href={isSignup ? "/login" : "/signup"}>{isSignup ? "Log in" : "Create an account"}</a></p>
          <p className="auth-card__footnote"><LockKey size={13} /> Protected with Supabase authentication when configured.</p>
        </div>
      </div>
      <div className="auth-shell__footer"><span>© 2026 Pareto</span><span>Built for a transparent recruiting experience.</span></div>
    </main>
  );
}
