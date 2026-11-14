"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";
import { SignOut } from "@phosphor-icons/react";

export default function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    setBusy(true);
    const client = createBrowserClient(url, key);
    const result = await client.auth.signOut();
    if (result.error) {
      setError(result.error.message);
      setBusy(false);
    } else {
      window.location.assign("/");
    }
  }
  return <div className="dashboard-signout"><button type="button" onClick={signOut} disabled={busy}><SignOut size={17} /> {busy ? "Signing out…" : "Sign out"}</button>{error && <p role="alert">{error}</p>}</div>;
}
