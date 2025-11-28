"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

const SIDEBAR_KEY = "mwbrent-sidebar-collapsed";

export const AppShell: React.FC<Props> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Load initial state from localStorage (so it remembers your choice)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SIDEBAR_KEY);
      if (raw === "1") setCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };

  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/contacts", label: "Contacts" },
    { href: "/properties", label: "Properties" },
    { href: "/appraisals", label: "Appraisals" },
    { href: "/tasks", label: "Tasks" },
  ];

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
                {/* Bullet / icon placeholder */}
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

        {/* Bottom mini status (optional) */}
        {!collapsed && (
          <div className="border-t border-slate-200 p-3 text-[11px] text-slate-500">
            Signed in as <span className="font-medium">Brent</span>
          </div>
        )}
      </aside>

      {/* MAIN AREA */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Mobile/iPad header toggle if you want it too */}
        <header className="flex h-12 items-center gap-2 border-b border-slate-200 bg-white px-3 lg:px-4">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 lg:hidden"
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            ☰
          </button>
          <span className="text-sm font-medium text-slate-800">Workspace</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};
