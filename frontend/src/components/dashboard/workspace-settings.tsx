"use client";

import { useEffect, useState, type FormEvent } from "react";

type Workspace = { id: string; name: string; role: "OWNER" | "ADMIN" | "RECRUITER" | "VIEWER"; canManage: boolean };
type Settings = {
  jobTitle: string | null;
  notifyConfirmed: boolean;
  notifyRefined: boolean;
  workspaces: Workspace[];
};

async function accountRequest<T>(path: string, method = "GET", body?: object): Promise<T> {
  const response = await fetch(path, {
    method, cache: "no-store",
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
      ? data.error : "Your settings could not be saved.";
    throw new Error(message);
  }
  return data as T;
}

function roleTitle(role: Workspace["role"]) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export default function WorkspaceSettings({ section }: { section: "professional" | "notifications" }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [notifyConfirmed, setNotifyConfirmed] = useState(true);
  const [notifyRefined, setNotifyRefined] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [professionalMessage, setProfessionalMessage] = useState("");
  const [notificationsMessage, setNotificationsMessage] = useState("");
  const [workspaceMessage, setWorkspaceMessage] = useState("");

  function apply(data: Settings) {
    setSettings(data);
    setTitle(data.jobTitle ?? "");
    setNotifyConfirmed(data.notifyConfirmed);
    setNotifyRefined(data.notifyRefined);
    const owned = data.workspaces.find(item => item.role === "OWNER");
    setCompany(owned?.name ?? "");
  }

  useEffect(() => {
    let live = true;
    void accountRequest<Settings>("/api/v1/account")
      .then(data => { if (live) apply(data); })
      .catch(error => { if (live) setLoadError(error instanceof Error ? error.message : "Settings unavailable."); });
    return () => { live = false; };
  }, []);

  async function saveTitle(event: FormEvent) {
    event.preventDefault();
    if (!settings || busy) return;
    setBusy(true); setProfessionalMessage("");
    try {
      apply(await accountRequest<Settings>("/api/v1/account", "PATCH", { jobTitle: title.trim() || null }));
      setProfessionalMessage("Professional details saved.");
    } catch (error) { setProfessionalMessage(error instanceof Error ? error.message : "Could not save job title."); }
    finally { setBusy(false); }
  }

  async function saveCompany(event: FormEvent) {
    event.preventDefault();
    if (!settings || busy || company.trim().length < 2) return;
    setBusy(true); setWorkspaceMessage("");
    try {
      const owned = settings.workspaces.find(item => item.role === "OWNER");
      const endpoint = "/api/v1/account/workspace";
      const result = await accountRequest<Settings>(endpoint, owned ? "PATCH" : "POST",
        owned ? { organizationId: owned.id, name: company.trim() } : { name: company.trim() });
      apply(result);
      setWorkspaceMessage(owned ? "Company workspace updated." : "Company workspace created.");
    } catch (error) { setWorkspaceMessage(error instanceof Error ? error.message : "Workspace update failed."); }
    finally { setBusy(false); }
  }

  async function saveNotifications(event: FormEvent) {
    event.preventDefault();
    if (!settings || busy) return;
    setBusy(true); setNotificationsMessage("");
    try {
      apply(await accountRequest<Settings>("/api/v1/account", "PATCH", { notifyConfirmed, notifyRefined }));
      setNotificationsMessage("Notification preferences saved.");
    } catch (error) { setNotificationsMessage(error instanceof Error ? error.message : "Notification preferences could not be saved."); }
    finally { setBusy(false); }
  }

  return <>
    {section === "professional" && <section className="pareto-profile-section" aria-labelledby="profile-professional">
      <h2 id="profile-professional">Professional information</h2>
      <p>Your job title is personal information. Company membership and roles are managed by the workspace.</p>
      {loadError && <p className="pareto-profile-message pareto-profile-message--error" role="alert">{loadError}</p>}
      {!settings && !loadError && <p role="status">Loading professional details…</p>}
      {settings && <>
        <form className="pareto-profile-form" onSubmit={saveTitle}>
          <label>Job title
            <input maxLength={120} value={title} disabled={busy}
              placeholder="e.g. Talent Acquisition Manager" onChange={event => setTitle(event.target.value)}/>
          </label>
          {professionalMessage && <p role="status" className="pareto-profile-message">{professionalMessage}</p>}
          <button type="submit" disabled={busy}>Save job title</button>
        </form>
        <div className="pareto-workspace-memberships">
          <h3>Organization &amp; workspace</h3>
          {settings.workspaces.length ? <dl>
            {settings.workspaces.map(workspace => <div key={workspace.id}>
              <dt>{workspace.name}</dt><dd>Workspace role: {roleTitle(workspace.role)}</dd>
            </div>)}
          </dl> : <p>No organization workspace is linked to your account.</p>}
          {(!settings.workspaces.length || settings.workspaces.some(item => item.role === "OWNER")) &&
            <form className="pareto-profile-form" onSubmit={saveCompany}>
              <label>{settings.workspaces.length ? "Company name" : "Create a company workspace"}
                <input required minLength={2} maxLength={120} disabled={busy}
                  placeholder="Company or organization name" value={company}
                  onChange={event => setCompany(event.target.value)}/>
              </label>
              <small>Creating a workspace records your company name and gives your account the Owner role. It does not verify company affiliation or expose your private candidate records to other users.</small>
              {workspaceMessage && <p className="pareto-profile-message" role="status">{workspaceMessage}</p>}
              <button type="submit" disabled={busy || company.trim().length < 2}>
                {settings.workspaces.length ? "Update company name" : "Create workspace"}
              </button>
            </form>}
        </div>
      </>}
    </section>}
    {section === "notifications" && <section className="pareto-profile-section" aria-labelledby="profile-notifications">
      <h2 id="profile-notifications">Notifications</h2>
      <p>In-app notifications are generated by actual confirmed searches. These options do not send email.</p>
      {settings && <form className="pareto-profile-form" onSubmit={saveNotifications}>
        <label className="pareto-setting-checkbox">
          <input type="checkbox" checked={notifyConfirmed} disabled={busy}
            onChange={event => setNotifyConfirmed(event.target.checked)}/>
          <span>Notify when a new candidate search is confirmed</span>
        </label>
        <label className="pareto-setting-checkbox">
          <input type="checkbox" checked={notifyRefined} disabled={busy}
            onChange={event => setNotifyRefined(event.target.checked)}/>
          <span>Notify when a confirmed search is refined</span>
        </label>
        {notificationsMessage && <p className="pareto-profile-message" role="status">{notificationsMessage}</p>}
        <button type="submit" disabled={busy}>Save notification preferences</button>
      </form>}
    </section>}
  </>;
}
