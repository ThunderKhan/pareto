"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight, CaretDown, House, MagnifyingGlass, SidebarSimple,
  UserCircle, UsersThree, X,
} from "@phosphor-icons/react";
import SignOutButton from "@/components/auth/sign-out";
import "./dashboard.css";

type RecruiterIdentity = {
  email: string;
  firstName: string;
  lastName: string;
};

const navigation = [
  { label: "Overview", href: "/dashboard", Icon: House },
  { label: "AI candidate search", href: "/dashboard/search", Icon: MagnifyingGlass },
  { label: "Candidates", href: "/dashboard/candidates", Icon: UsersThree },
  { label: "My profile", href: "/dashboard/profile", Icon: UserCircle },
];

function initials(user: RecruiterIdentity) {
  return [user.firstName, user.lastName].filter(Boolean).map(value => value[0]?.toUpperCase()).join("") ||
    user.email.slice(0, 2).toUpperCase();
}

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
  const current = navigation.find(item => item.href === path) ??
    navigation.find(item => item.href !== "/dashboard" && path.startsWith(item.href + "/")) ??
    navigation[0];

  return <div className={"pareto-app" + (collapsed ? " pareto-app--collapsed" : "")}>
    {mobileOpen && <button className="pareto-sidebar-backdrop" type="button"
      onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <aside id="pareto-navigation" className={"pareto-sidebar" + (mobileOpen ? " pareto-sidebar--open" : "")}
      aria-label="Recruiter navigation">
      <div className="pareto-sidebar__header">
        <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="pareto-sidebar__brand" aria-label="Pareto workspace">
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
            const active = href === "/dashboard" ? path === href : path === href || path.startsWith(href + "/");
            return <Link key={href} href={href} title={collapsed ? label : undefined}
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
        <div className="pareto-nav__note">
          <span className="pareto-nav__note-dot" aria-hidden="true" />
          <p>Human-confirmed search. Evidence you can inspect.</p>
        </div>
      </div>
      <details className="pareto-account">
        <summary aria-label={"Account menu for " + identityName(user)}>
          <span className="pareto-avatar" aria-hidden="true">{initials(user)}</span>
          <span className="pareto-account__identity">
            <strong>{identityName(user)}</strong>
            <small title={user.email}>{user.email}</small>
          </span>
          <CaretDown size={16} className="pareto-account__caret" aria-hidden="true" />
        </summary>
        <div className="pareto-account__actions">
          <Link href="/dashboard/profile" onClick={() => setMobileOpen(false)}><UserCircle size={17}/> Account settings</Link>
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
          <span className="pareto-topbar__crumb">Workspace</span>
          <span className="pareto-topbar__slash" aria-hidden="true">/</span>
          <strong>{current.label}</strong>
        </div>
        <div className="pareto-topbar__right">
          <span className="pareto-topbar__private">Recruiter workspace</span>
          <Link href="/dashboard/search" className="pareto-topbar__action">
            New search <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </header>
      {children}
    </div>
  </div>;
}
