"use client";

import React from "react";
import Link from "next/link";

type UserMenuProps = {
  userEmail: string | null;
};

export function UserMenu({ userEmail }: UserMenuProps) {
  const handleLogout = async () => {
    try {
      await fetch("/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed", err);
      window.location.reload();
    }
  };

  if (!userEmail) {
    return (
      <Link
        href="/login"
        className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="hidden text-slate-600 sm:inline">{userEmail}</span>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-full bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600"
      >
        Logout
      </button>
    </div>
  );
}
