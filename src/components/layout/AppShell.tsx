"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { GlobalSearchBox } from "@/components/search/GlobalSearchBox";
import { Footer } from "./Footer";

type Props = {
  children: React.ReactNode;
};

const SIDEBAR_KEY = "mwbrent-sidebar-collapsed";

export const AppShell: React.FC<Props> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // 🔒 DETECT KIOSK ROUTES (standalone mode)
  const isKiosk =
    pathname?.startsWith("/open-homes/") && pathname.includes("/kiosk");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SIDEBAR_KEY);
      if (raw === "1") setCollapsed(true);
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/contacts", label: "Contacts" },
    { href: "/properties", label: "Properties" },
    { href: "/appraisals", label: "Appraisals" },
    { href: "/pipeline", label: "Pipeline" },
    { href: "/tasks", label: "Tasks" },
    { href: "/open-homes", label: "Open Homes" },
  ];

  // 🧾 KIOSK MODE: no CRM chrome, just the kiosk UI
  if (isKiosk) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">{children}</div>
    );
  }

  // 🧱 NORMAL CRM SHELL
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* SIDEBAR */}
      <aside
        className={`flex flex-col border-r border-slate-200 bg-white transition-all duration-200 ${
          collapsed ? "w-14" : "w-60"
        }`}
      >
        {/* Top: logo + toggle */}
        <div className="flex h-14 items-center justify-between px-3">
          <div
            className={`flex items-center gap-2 overflow-hidden transition-opacity ${
              collapsed ? "opacity-0" : "opacity-100"
            }`}
          >
            <span className="h-7 w-7 rounded-full bg-slate-900 text-[11px] font-semibold text-white flex items-center justify-center">
              B
            </span>
            <span className="truncate text-sm font-semibold text-slate-900">
              Move With Brent
            </span>
          </div>

          <button
            type="button"
            onClick={toggleCollapsed}
            className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100"
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        {/* Nav */}
        <nav className="mt-2 flex-1 space-y-1 px-1">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    active ? "bg-white" : "bg-slate-400"
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="border-t border-slate-200 p-3 text-[11px] text-slate-500">
            Signed in as <span className="font-medium">Brent</span>
          </div>
        )}
      </aside>

      {/* MAIN AREA */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-slate-900">CRM</h1>

            <div className="hidden md:block w-64">
              <GlobalSearchBox />
            </div>
          </div>

          <LogoutButton />
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>

        {/* FOOTER */}
        <Footer />
      </div>
    </div>
  );
};
