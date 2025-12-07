"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";

type Props = {
  children: React.ReactNode;
};

export function RootShell({ children }: Props) {
  const pathname = usePathname();

  // Any /open-homes/[eventId]/kiosk route should render as a standalone app
  const isKioskRoute =
    typeof pathname === "string" &&
    pathname.startsWith("/open-homes/") &&
    pathname.includes("/kiosk");

  if (isKioskRoute) {
    // No CRM chrome – kiosk owns the whole screen
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">{children}</div>
    );
  }

  // Everything else uses the standard CRM shell
  return <AppShell>{children}</AppShell>;
}
