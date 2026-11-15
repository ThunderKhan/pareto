"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import Image from "next/image";

export default function MfaChallenge({ next }: { next: string }) {
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  }, []);
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Checking your authenticator…");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!client) return;
    let active = true;
    void (async () => {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (!active) return;
      if (userError || !userData.user) {
        window.location.replace("/login?next=" + encodeURIComponent(next));
        return;
      }
      const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!active) return;
      if (assuranceError) { setError(assuranceError.message); setStatus(""); return; }
      if (assurance.currentLevel === "aal2" || assurance.nextLevel !== "aal2") {
        window.location.replace(next);
        return;
      }
      const { data, error: factorsError } = await client.auth.mfa.listFactors();
      if (!active) return;
      if (factorsError) { setError(factorsError.message); setStatus(""); return; }
      const factor = data.totp.find(f => f.status === "verified");
      if (!factor) {
        setError("This account requires two-factor authentication but has no available verified authenticator. Contact your administrator.");
      } else {
        setFactorId(factor.id);
        setStatus("");
      }
    })();
    return () => { active = false; };
  }, [client, next]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!client || !factorId || busy || !/^\d{6}$/.test(code)) return;
    setBusy(true); setError("");
    try {
      const { error: verificationError } = await client.auth.mfa.challengeAndVerify({ factorId, code });
      if (verificationError) throw verificationError;
      window.location.replace(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to verify code.");
      setBusy(false);
    }
  }

  return <main className="pareto-mfa-page">
    <section className="pareto-mfa-card" aria-labelledby="mfa-title">
      <Link href="/" className="pareto-mfa-brand" aria-label="Pareto home">
        <Image src="/brand/pareto-mark.svg" alt="" width={34} height={34} unoptimized/>
        pareto<span>.</span>
      </Link>
      <h1 id="mfa-title">Verify your account.</h1>
      <p>Enter the six-digit code from your authenticator app to finish signing in.</p>
      <form onSubmit={submit}>
        <label htmlFor="mfa-code">Authenticator code</label>
        <input id="mfa-code" type="text" inputMode="numeric" autoComplete="one-time-code"
          pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code}
          onChange={event => setCode(event.target.value.replace(/[^0-9]/g, "").slice(0,6))}
          disabled={busy || !factorId} placeholder="000000"/>
        {status && <p role="status">{status}</p>}
        {error && <p role="alert" className="pareto-mfa-error">{error}</p>}
        <button type="submit" disabled={busy || !factorId || code.length !== 6}>
          {busy ? "Verifying…" : "Verify and continue"}
        </button>
      </form>
    </section>
  </main>;
}
