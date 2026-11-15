"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "@phosphor-icons/react";

type Notice = { id: string; title: string; createdAt: string; readAt: string | null; sessionId: string };
type Inbox = { items: Notice[]; unread: number };

export default function NotificationsMenu() {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("Notifications are unavailable.");
      setInbox(await response.json() as Inbox);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load notifications."); }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
    window.addEventListener("pareto:search-confirmed", load);
    return () => window.removeEventListener("pareto:search-confirmed", load);
  }, [load]);

  async function mark(ids: string[]) {
    if (working || !ids.length) return;
    setWorking(true); setError("");
    try {
      const response = await fetch("/api/v1/notifications", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) throw new Error("Notifications could not be updated.");
      setInbox(await response.json() as Inbox);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Update failed."); }
    finally { setWorking(false); }
  }

  return <details className="pareto-notifications" onToggle={event => {
    if (event.currentTarget.open) void load();
  }}>
    <summary aria-label={inbox?.unread ? `Notifications, ${inbox.unread} unread` : "Notifications"}>
      <Bell size={20} aria-hidden="true"/>
      {Boolean(inbox?.unread) && <span className="pareto-notifications__unread">{inbox!.unread}</span>}
    </summary>
    <section className="pareto-notifications__panel" aria-label="Recent notifications">
      <header><h2>Notifications</h2>
        {Boolean(inbox?.unread) && <button type="button" disabled={working} onClick={() => void mark(
          inbox!.items.filter(item => !item.readAt).map(item => item.id)
        )}>Mark all read</button>}
      </header>
      {error && <p role="alert" className="pareto-notifications__error">{error}</p>}
      {!inbox && !error && <p role="status">Loading notifications…</p>}
      {inbox && (inbox.items.length ? <ul>{inbox.items.map(item => <li key={item.id}
        className={item.readAt ? "" : "pareto-notifications__item--unread"}>
        <Link href={"/dashboard/search?session=" + encodeURIComponent(item.sessionId)}>{item.title}</Link>
        <small>{new Date(item.createdAt).toLocaleString()}</small>
        {!item.readAt && <button type="button" disabled={working}
          onClick={() => void mark([item.id])}>Mark read</button>}
      </li>)}</ul> : <p className="pareto-notifications__empty">No notifications yet.</p>)}
    </section>
  </details>;
}
