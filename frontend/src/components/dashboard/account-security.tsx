"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Factor = { id: string; friendly_name?: string | null };
type Enrollment = { id: string; qr: string; secret: string };

export default function AccountSecurity() {
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  }, []);

  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [aal2, setAal2] = useState(false);
  const [activeHere, setActiveHere] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmOthers, setConfirmOthers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const reload = useCallback(async () => {
    if (!client) { setLoading(false); return; }
    const [list, level, user] = await Promise.all([
      client.auth.mfa.listFactors(),
      client.auth.mfa.getAuthenticatorAssuranceLevel(),
      client.auth.getUser(),
    ]);
    if (list.error) throw list.error;
    if (level.error) throw level.error;
    if (user.error) throw user.error;
    setFactors(list.data.totp.filter(factor => factor.status === "verified"));
    setAal2(level.data.currentLevel === "aal2");
    setActiveHere(Boolean(user.data.user));
    setLoading(false);
  }, [client]);

  useEffect(() => {
    let active = true;
    void reload().catch(cause => {
      if (active) { setError(cause instanceof Error ? cause.message : "Security settings unavailable."); setLoading(false); }
    });
    return () => { active = false; };
  }, [reload]);

  async function startEnroll() {
    if (!client || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { data, error: failure } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Pareto authenticator" });
      if (failure) throw failure;
      if (!data.totp?.qr_code || !data.totp.secret) throw new Error("Authenticator enrollment was not returned.");
      setEnrollment({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
      setCode("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not start two-factor enrollment."); }
    finally { setBusy(false); }
  }

  async function verifyEnroll(event: FormEvent) {
    event.preventDefault();
    if (!client || !enrollment || busy || !/^\d{6}$/.test(code)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: failure } = await client.auth.mfa.challengeAndVerify({
        factorId: enrollment.id, code,
      });
      if (failure) throw failure;
      setEnrollment(null); setCode("");
      await reload();
      setMessage("Two-factor authentication is enabled.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Verification failed."); }
    finally { setBusy(false); }
  }

  async function verifyFactor(event: FormEvent) {
    event.preventDefault();
    if (!client || !factors.length || busy || !/^\d{6}$/.test(code)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: failure } = await client.auth.mfa.challengeAndVerify({ factorId: factors[0].id, code });
      if (failure) throw failure;
      setCode("");
      await reload();
      setMessage("Authenticator verified for this session. You may now manage factors.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Verification failed."); }
    finally { setBusy(false); }
  }

  async function removeFactor() {
    if (!client || !factors.length || !aal2 || busy) return;
    if (!confirmRemove) { setConfirmRemove(true); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: failure } = await client.auth.mfa.unenroll({ factorId: factors[0].id });
      if (failure) throw failure;
      setConfirmRemove(false);
      await reload();
      setMessage("Authenticator removed.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove the authenticator."); }
    finally { setBusy(false); }
  }

  async function endOtherSessions() {
    if (!client || !confirmOthers || busy) { setConfirmOthers(true); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: failure } = await client.auth.signOut({ scope: "others" });
      if (failure) throw failure;
      setConfirmOthers(false);
      setMessage("Other Supabase sessions have been revoked. Access tokens may remain valid until expiry.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to revoke other sessions."); }
    finally { setBusy(false); }
  }

  function updateCode(value: string) {
    setCode(value.replace(/[^0-9]/g, "").slice(0, 6));
  }

  return <div className="pareto-profile-security-controls">
    <section aria-labelledby="profile-mfa">
      <h3 id="profile-mfa">Two-factor authentication</h3>
      <p>Use a time-based authenticator app. Supabase does not issue recovery codes; store a separate recovery factor if your security policy requires one.</p>
      {loading && <p role="status">Checking your account protection…</p>}
      {!loading && !factors.length && !enrollment && <button className="pareto-secondary-action" type="button"
        disabled={!client || busy} onClick={() => void startEnroll()}>Set up authenticator</button>}
      {enrollment && <form className="pareto-profile-form pareto-mfa-enrollment" onSubmit={verifyEnroll}>
        <p>Scan this code with your authenticator app, then enter its current six-digit code.</p>
        <Image src={enrollment.qr} width={168} height={168} alt="Authenticator QR enrollment code" unoptimized />
        <details><summary>Enter the setup key manually</summary><code>{enrollment.secret}</code></details>
        <label>Authenticator code
          <input type="text" inputMode="numeric" autoComplete="one-time-code"
            required pattern="[0-9]{6}" minLength={6} maxLength={6}
            value={code} disabled={busy} onChange={event => updateCode(event.target.value)}
            placeholder="000000"/>
        </label>
        <button type="submit" disabled={busy || code.length !== 6}>Verify and enable 2FA</button>
        <button type="button" className="pareto-secondary-action" disabled={busy}
          onClick={() => { setEnrollment(null); setCode(""); }}>Cancel</button>
      </form>}
      {!loading && factors.length > 0 && !enrollment && <>
        <p className="pareto-security-enabled">Authenticator enabled ({factors.length} verified factor{factors.length === 1 ? "" : "s"}).</p>
        {!aal2 && <form className="pareto-profile-form" onSubmit={verifyFactor}>
          <label>Verify authenticator to manage 2FA
            <input type="text" inputMode="numeric" autoComplete="one-time-code"
              pattern="[0-9]{6}" minLength={6} maxLength={6} required
              value={code} disabled={busy} onChange={event => updateCode(event.target.value)}
              placeholder="000000"/>
          </label>
          <button type="submit" disabled={busy || code.length !== 6}>Verify authenticator</button>
        </form>}
        {aal2 && <div className="pareto-profile-security-actions">
          <button type="button" className="pareto-secondary-action" disabled={busy}
            onClick={() => void removeFactor()}>{confirmRemove ? "Confirm remove authenticator" : "Remove authenticator"}</button>
          {confirmRemove && <button type="button" className="pareto-secondary-action"
            onClick={() => setConfirmRemove(false)}>Cancel</button>}
        </div>}
      </>}
    </section>
    <section aria-labelledby="profile-sessions">
      <h3 id="profile-sessions">Active sessions</h3>
      <p>{activeHere ? "This browser has a verified Supabase session." : "No current session could be verified."}</p>
      <p>Supabase&apos;s standard client API does not provide a per-device session list. You can revoke all other sessions without affecting this browser.</p>
      <div className="pareto-profile-security-actions">
        <button type="button" className="pareto-secondary-action" disabled={!client || busy || !activeHere}
          onClick={() => void endOtherSessions()}>
          {confirmOthers ? "Confirm sign out on other devices" : "Sign out on other devices"}
        </button>
        {confirmOthers && <button type="button" className="pareto-secondary-action"
          onClick={() => setConfirmOthers(false)}>Cancel</button>}
      </div>
    </section>
    {error && <p role="alert" className="pareto-profile-message pareto-profile-message--error">{error}</p>}
    {message && <p role="status" className="pareto-profile-message">{message}</p>}
  </div>;
}
