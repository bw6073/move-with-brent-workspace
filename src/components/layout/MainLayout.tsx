// src/components/layout/MainLayout.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlobalSearchBox } from "@/components/search/GlobalSearchBox";
import { Menu } from "lucide-react";
import { UserMenu } from "@/components/layout/UserMenu";

type MainLayoutProps = {
  children: React.ReactNode;
  userEmail?: string | null;
};

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/contacts", label: "Contacts" },
  { href: "/properties", label: "Properties" },
  { href: "/appraisals", label: "Appraisals" },
  { href: "/tasks", label: "Tasks" },
];

export function MainLayout({ children, userEmail }: MainLayoutProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          {/* Mobile menu button */}
          <button
            type="button"
            className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={18} strokeWidth={2} />
          </button>

          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              Move With Brent
            </span>
            <span className="text-sm font-semibold text-slate-900">
              CRM & Appraisals
            </span>
          </div>

          {/* Right side – search + user menu */}
          <div className="flex items-center gap-3 pl-4 md:pl-12">
            <div className="flex-1 flex justify-end">
              <GlobalSearchBox />
            </div>
            <UserMenu userEmail={userEmail ?? null} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-slate-900 text-slate-100 md:flex md:min-h-[calc(100vh-48px)] md:flex-col">
          <div className="flex flex-1 flex-col">
            <nav className="mt-4 space-y-1 px-3">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center rounded-full px-3 py-1.5 text-sm ${
                      active
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Sidebar footer – no email here, just a subtle status line */}
            <div className="mt-auto px-4 py-4 text-[11px] text-slate-400">
              {userEmail ? "Signed in" : "Not signed in"}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 px-4 py-4 md:px-6 md:py-6">{children}</main>
      </div>

      {/* Mobile slide-out nav */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Backdrop */}
          <button
            type="button"
            className="h-full w-full bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
          />

          {/* Drawer */}
          <div
            className="relative h-full w-64 bg-slate-900 text-slate-100 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                  Move With Brent
                </span>
                <span className="text-sm font-semibold text-white">
                  CRM & Appraisals
                </span>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-500 text-slate-100 hover:bg-slate-800"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
              >
                ✕
              </button>
            </div>

            <nav className="mt-3 space-y-1 px-3">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center rounded-full px-3 py-2 text-sm ${
                      active
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-200 hover:bg-slate-800"
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto px-4 py-4">
              <UserMenu userEmail={userEmail ?? null} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
