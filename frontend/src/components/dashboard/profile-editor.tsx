"use client";

import { useMemo, useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Check, LockKey, UserCircle } from "@phosphor-icons/react";
import ThemePicker from "./theme-picker";

function useAuthClient() {
  return useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  }, []);
}

export default function ProfileEditor({ email, firstName, lastName, themePreference }: {
  email: string;
  firstName: string;
  lastName: string;
  themePreference: string;
}) {
  const router = useRouter();
  const client = useAuthClient();
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [securityMessage, setSecurityMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!client || busy) return;
    const firstName = first.trim(), lastName = last.trim();
    if (!firstName || !lastName) {
      setMessage({ text: "Both names are required.", error: true });
      return;
    }
    setBusy(true); setMessage(null);
    try {
      const { error } = await client.auth.updateUser({ data: { first_name: firstName, last_name: lastName } });
      if (error) throw error;
      setFirst(firstName); setLast(lastName);
      setMessage({ text: "Profile saved.", error: false });
      router.refresh();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Your profile could not be saved.", error: true });
    } finally { setBusy(false); }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (!client || busy) return;
    if (password.length < 8) {
      setSecurityMessage({ text: "Use at least 8 characters for your new password.", error: true });
      return;
    }
    if (password !== confirm) {
      setSecurityMessage({ text: "The passwords do not match.", error: true });
      return;
    }
    setBusy(true); setSecurityMessage(null);
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      setPassword(""); setConfirm("");
      setSecurityMessage({ text: "Password updated successfully.", error: false });
    } catch (error) {
      setSecurityMessage({ text: error instanceof Error ? error.message : "Password update failed. Please sign in again if asked.", error: true });
    } finally { setBusy(false); }
  }

  return <div className="pareto-profile-card">
    <section aria-labelledby="profile-personal-heading">
      <h2 id="profile-personal-heading"><UserCircle size={21} weight="duotone" aria-hidden="true"/> Personal details</h2>
      <p>Your name appears in your private Pareto workspace.</p>
      <form className="pareto-profile-form" onSubmit={saveProfile} aria-busy={busy}>
        <div className="pareto-profile-two">
          <label>First name
            <input type="text" autoComplete="given-name" required maxLength={80} value={first} onChange={event => setFirst(event.target.value)} disabled={busy}/>
          </label>
          <label>Last name
            <input type="text" autoComplete="family-name" required maxLength={80} value={last} onChange={event => setLast(event.target.value)} disabled={busy}/>
          </label>
        </div>
        <label>Account email
          <input type="email" value={email} disabled aria-describedby="profile-email-note"/>
        </label>
        <small id="profile-email-note">Your email is managed by the authentication provider. It cannot be changed from this form.</small>
        {message && <p className={"pareto-profile-message" + (message.error ? " pareto-profile-message--error" : "")}
          role={message.error ? "alert" : "status"}>{message.text}</p>}
        <button type="submit" disabled={!client || busy}><Check size={17}/>{busy ? "Saving…" : "Save changes"}</button>
      </form>
    </section>
    <section className="pareto-profile-security" aria-labelledby="profile-security-heading">
      <h2 id="profile-security-heading"><LockKey size={20} weight="duotone" aria-hidden="true"/> Password & security</h2>
      <p>Choose a new password for your email/password sign-in. Depending on your account&rsquo;s security settings, you may be asked to reauthenticate.</p>
      <form className="pareto-profile-form" onSubmit={changePassword} aria-busy={busy}>
        <label>New password
          <input type="password" autoComplete="new-password" minLength={8} required value={password}
            onChange={event => setPassword(event.target.value)} disabled={!client || busy} placeholder="At least 8 characters"/>
        </label>
        <label>Confirm new password
          <input type="password" autoComplete="new-password" minLength={8} required value={confirm}
            onChange={event => setConfirm(event.target.value)} disabled={!client || busy} placeholder="Repeat new password"/>
        </label>
        {securityMessage && <p className={"pareto-profile-message" + (securityMessage.error ? " pareto-profile-message--error" : "")}
          role={securityMessage.error ? "alert" : "status"}>{securityMessage.text}</p>}
        <button type="submit" disabled={!client || busy}><LockKey size={17}/>{busy ? "Updating…" : "Change password"}</button>
      </form>
    </section>
    <ThemePicker initialValue={themePreference} />
  </div>;
}
