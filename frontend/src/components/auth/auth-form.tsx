"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowRight, Eye, EyeSlash } from "@phosphor-icons/react";
import AuthArtwork from "./auth-artwork";

type Mode = "login" | "signup";
type AuthMessage = { text: string; error: boolean };

function safeNext() {
  if (typeof window === "undefined") return "/dashboard";
  const next = new URLSearchParams(window.location.search).get("next");
  return next && (next === "/dashboard" || /^\/dashboard\/(?!\/)/.test(next))
    ? next : "/dashboard";
}

function GoogleIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/>
    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84Z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" fill="#EA4335"/>
  </svg>;
}

/** One form for both modes; credentials always go through the existing Supabase flow. */
export default function AuthForm({ mode }: { mode: Mode }) {
  const signup = mode === "signup";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<AuthMessage | null>(null);

  const missingSettings = [
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" : null,
  ].filter((setting): setting is string => setting !== null);

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
      if (signup) {
        const next = safeNext();
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin + "/auth/callback?next=" + encodeURIComponent(next),
            data: { first_name: firstName.trim(), last_name: lastName.trim() },
          },
        });
        if (error) throw error;
        if (data.session) window.location.assign(next);
        else setMessage({ text: "Check your inbox for a verification email if confirmation is enabled, then return to log in.", error: false });
      } else {
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        // Names are optional on sign-in: they are profile details, not credentials.
        // Never overwrite an existing name with an empty input.
        const nameUpdates = {
          ...(firstName.trim() ? { first_name: firstName.trim() } : {}),
          ...(lastName.trim() ? { last_name: lastName.trim() } : {}),
        };
        if (Object.keys(nameUpdates).length > 0) {
          const { error: profileError } = await client.auth.updateUser({ data: nameUpdates });
          if (profileError) {
            // Do not strand a successfully authenticated user on the sign-in page
            // because an optional profile update failed.
            console.warn("Optional profile name update failed:", profileError.message);
          }
        }
        window.location.assign(safeNext());
      }
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Authentication could not be completed. Try again.", error: true });
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    if (!client || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/auth/callback?next=" + encodeURIComponent(safeNext()),
        },
      });
      if (error) throw error;
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Google sign-in could not be started.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell">
    <div className="auth-layout">
      <section className="auth-sheet" aria-labelledby="auth-title">
        <header className="auth-sheet__header">
          <Link href="/" className="auth-brand" aria-label="Pareto home">
            <Image src="/brand/pareto-mark.svg" width={37} height={37} alt="" aria-hidden="true" unoptimized />
            <span>pareto<span className="auth-brand__dot">.</span></span>
          </Link>
        </header>

        <div className="auth-sheet__center">
          <div className="auth-intro">
            <h1 id="auth-title">{signup ? "Create an account" : "Welcome back"}</h1>
            <p>{signup ? "Recruit smarter. See the reason behind every match." : "Sign in to continue your candidate search."}</p>
          </div>

          {!client && <div className="auth-card__notice" role="status">
            Supabase sign-in is not configured. Set <strong>{missingSettings.join(" and ")}</strong> in <code>frontend/.env.local</code>, then restart <code>pnpm dev</code>.
          </div>}

          <button className="auth-social" type="button" onClick={onGoogle} disabled={!client || busy}>
            <GoogleIcon /> {signup ? "Sign up with Google" : "Continue with Google"}
          </button>

          <div className="auth-divider"><span>or continue with email</span></div>

          <form className="auth-form" onSubmit={onSubmit}>
            <div className="auth-form__names">
              <label className="auth-field" htmlFor="auth-first-name">
                <input id="auth-first-name" type="text" autoComplete="given-name" value={firstName} onChange={event => setFirstName(event.target.value)} placeholder="e.g. Alex" maxLength={80} required={signup} disabled={!client || busy} />
                <span>First name{!signup && <small> (optional)</small>}</span>
              </label>
              <label className="auth-field" htmlFor="auth-last-name">
                <input id="auth-last-name" type="text" autoComplete="family-name" value={lastName} onChange={event => setLastName(event.target.value)} placeholder="e.g. Morgan" maxLength={80} required={signup} disabled={!client || busy} />
                <span>Last name{!signup && <small> (optional)</small>}</span>
              </label>
            </div>

            <label className="auth-field" htmlFor="auth-email">
              <input id="auth-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@company.com" required disabled={!client || busy} />
              <span>Email</span>
            </label>
            <label className="auth-field" htmlFor="auth-password">
              <input id="auth-password" type={revealPassword ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 6 characters" minLength={6} required disabled={!client || busy} />
              <span>Password</span>
            </label>
            <div className="auth-form__aside">
              <button type="button" className="auth-show-password" onClick={() => setRevealPassword(value => !value)} aria-label={revealPassword ? "Hide password" : "Show password"} disabled={!client || busy}>
                {revealPassword ? <EyeSlash size={17} aria-hidden="true"/> : <Eye size={17} aria-hidden="true"/>}
                {revealPassword ? "Hide" : "Show"} password
              </button>
              {!signup && <Link className="auth-forgot" href="/forgot-password">Forgot password?</Link>}
            </div>

            {message && <p className={"auth-message" + (message.error ? " auth-message--error" : "")} role={message.error ? "alert" : "status"}>{message.text}</p>}

            <button type="submit" className="auth-submit" disabled={!client || busy}>
              {busy ? "Working…" : signup ? "Create account" : "Log in"} <ArrowRight size={19} aria-hidden="true" />
            </button>
          </form>
          <p className="auth-switch">{signup ? "Already have an account?" : "New to Pareto?"}{" "}
            <Link href={signup ? "/login" : "/signup"}>{signup ? "Log in" : "Create an account"}</Link>
          </p>
        </div>

      </section>
      <AuthArtwork mode={mode}/>
    </div>
  </main>;
}
