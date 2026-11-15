"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Moon, Sun, Desktop } from "@phosphor-icons/react";

export type ThemePreference = "light" | "dark" | "system";
const choices: { id: ThemePreference; title: string; Icon: typeof Sun }[] = [
  { id: "light", title: "Light", Icon: Sun },
  { id: "dark", title: "Dark", Icon: Moon },
  { id: "system", title: "System", Icon: Desktop },
];

function valid(preference: string): ThemePreference {
  return preference === "light" || preference === "dark" ? preference : "system";
}

export function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  root.dataset.paretoPreference = preference;
  root.dataset.paretoEffectiveTheme = preference === "system"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    : preference;
  try { localStorage.setItem("pareto-theme", preference); } catch { /* Private browsing may block storage. */ }
  window.dispatchEvent(new Event("pareto:theme-changed"));
}

export default function ThemePicker({ initialValue }: { initialValue: string }) {
  const [preference, setPreference] = useState<ThemePreference>(valid(initialValue));
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  }, []);

  async function select(value: ThemePreference) {
    if (working || !client || value === preference) return;
    const previous = preference;
    setWorking(true); setError("");
    setPreference(value);
    applyTheme(value);
    const { error: failure } = await client.auth.updateUser({ data: { theme_preference: value } });
    if (failure) {
      setPreference(previous); applyTheme(previous);
      setError(failure.message);
    }
    setWorking(false);
  }
  return <section className="pareto-profile-section" aria-labelledby="profile-appearance">
    <h2 id="profile-appearance">Appearance</h2>
    <p>Choose how your workspace looks. Your preference is saved to your account.</p>
    <div className="pareto-theme-options" role="group" aria-label="Color theme">
      {choices.map(({ id, title, Icon }) => <button key={id} type="button"
        className={"pareto-theme-option" + (preference === id ? " pareto-theme-option--selected" : "")}
        aria-pressed={preference === id} disabled={!client || working}
        onClick={() => void select(id)}>
        <Icon size={19} aria-hidden="true"/>{title}
      </button>)}
    </div>
    {error && <p role="alert" className="pareto-profile-message pareto-profile-message--error">{error}</p>}
  </section>;
}
