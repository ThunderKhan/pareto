"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CaretDown, FileArrowUp, House, MagnifyingGlass, SidebarSimple,
  UserCircle, UsersThree, X,
} from "@phosphor-icons/react";
import SignOutButton from "@/components/auth/sign-out";
import NotificationsMenu from "./notifications-menu";
import ParitoAvatar from "./parito-avatar";
import "./workspace-tokens.css";
import "./workspace-dark.css";
import "./dashboard.css";
import "./audit-polish.css";
import "./round-03.css";
import "./craft-unified.css";

type RecruiterIdentity = {
  email: string;
  firstName: string;
  lastName: string;
};

const navigation = [
  { label: "Overview", href: "/dashboard", Icon: House },
  { label: "AI candidate search", href: "/dashboard/search", Icon: MagnifyingGlass },
  { label: "Candidates", href: "/dashboard/candidates", Icon: UsersThree },
  { label: "Import resumes", href: "/dashboard/candidates/import", Icon: FileArrowUp },
];

function identityName(user: RecruiterIdentity) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Recruiter";
}

export default function DashboardShell({ children, user }: {
  children: ReactNode;
  user: RecruiterIdentity;
}) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountRef = useRef<HTMLDetailsElement>(null);
  const [recent, setRecent] = useState<{ id: string; title: string; version: number }[]>([]);
  useEffect(() => {
    let mounted = true;
    const load = () => {
      void fetch("/api/v1/search?history=1", { cache: "no-store" })
        .then(response => response.ok ? response.json() : [])
        .then((items: unknown) => {
          if (!mounted || !Array.isArray(items)) return;
          setRecent(items.filter((item): item is { id: string; title: string; version: number } =>
            item && typeof item === "object" && typeof item.id === "string" &&
            typeof item.title === "string" && typeof item.version === "number"));
        }).catch(() => { /* Search history does not block navigation. */ });
    };
    load();
    window.addEventListener("pareto:search-confirmed", load);
    return () => { mounted = false; window.removeEventListener("pareto:search-confirmed", load); };
  }, [path]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [mobileOpen]);

  // Keep the account control usable without a mouse and prevent a stranded popup.
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      const menu = accountRef.current;
      if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      const menu = accountRef.current;
      if (!menu?.open || event.key !== "Escape") return;
      event.preventDefault();
      menu.open = false;
      menu.querySelector<HTMLElement>("summary")?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  return <div className={"pareto-app" + (collapsed ? " pareto-app--collapsed" : "") + (path === "/dashboard/search" ? " pareto-app--search" : "")}>
    {mobileOpen && <button className="pareto-sidebar-backdrop" type="button"
      onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <aside id="pareto-navigation" className={"pareto-sidebar" + (mobileOpen ? " pareto-sidebar--open" : "")}
      aria-label="Recruiter navigation">
      <div className="pareto-sidebar__header">
        <Link href="/dashboard" onClick={() => setMobileOpen(false)}
          className="pareto-sidebar__brand" aria-label="Pareto workspace">
          <Image src="/brand/pareto-mark.svg" alt="" width={34} height={34} unoptimized />
          <span>pareto<span className="pareto-brand-dot">.</span></span>
        </Link>
        <button type="button" className="pareto-sidebar__toggle pareto-sidebar__toggle--desktop"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed}
          onClick={() => setCollapsed(value => !value)}><SidebarSimple size={20} /></button>
        <button type="button" className="pareto-sidebar__toggle pareto-sidebar__toggle--mobile"
          aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20}/></button>
      </div>
      <div className="pareto-sidebar__body">
        <p className="pareto-nav__eyebrow">WORKSPACE</p>
        <nav className="pareto-nav" aria-label="Dashboard navigation">
          {navigation.map(({label,href,Icon}) => {
            const active = href === "/dashboard" || href === "/dashboard/candidates" ? path === href : path === href || path.startsWith(href + "/");
            return <Link key={href} href={href} title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
              aria-current={active ? "page" : undefined} onClick={() => setMobileOpen(false)}
              className={"pareto-nav__link" + (active ? " pareto-nav__link--active" : "")}>
              <Icon size={19} weight={active ? "fill" : "regular"} aria-hidden="true"/>
              <span>{label}</span>
            </Link>;
          })}
        </nav>
        {recent.length > 0 && <div className="pareto-recent">
          <p className="pareto-nav__eyebrow">RECENT SEARCHES</p>
          {recent.map(item => <Link key={item.id} title={item.title} className="pareto-recent__item"
            onClick={() => setMobileOpen(false)}
            href={"/dashboard/search?session=" + encodeURIComponent(item.id)}>
            <span>{item.title}</span><small>v{item.version}</small>
          </Link>)}
        </div>}
      </div>
      <details ref={accountRef} className="pareto-account">
        <summary aria-label={"Account menu for " + identityName(user)}>
          <ParitoAvatar />
          <span className="pareto-account__identity">
            <strong>{identityName(user)}</strong>
            <small title={user.email}>{user.email}</small>
          </span>
          <CaretDown size={16} className="pareto-account__caret" aria-hidden="true" />
        </summary>
        <div className="pareto-account__actions">
          <Link href="/dashboard/profile" onClick={() => {
            setMobileOpen(false);
            if (accountRef.current) accountRef.current.open = false;
          }}><UserCircle size={17}/> Account settings</Link>
          <SignOutButton />
        </div>
      </details>
    </aside>
    <div className="pareto-app__body">
      <header className="pareto-topbar">
        <div className="pareto-topbar__left">
          <button type="button" className="pareto-topbar__menu" aria-label="Open navigation"
            aria-controls="pareto-navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>
            <SidebarSimple size={22}/>
          </button>
        </div>
        <div className="pareto-topbar__right">
          <NotificationsMenu />
          <Link href="/dashboard/search" className="pareto-topbar__action">
            New search
          </Link>
        </div>
      </header>
      {children}
    </div>
  </div>;
}
