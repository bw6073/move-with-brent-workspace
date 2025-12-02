"use client";

export function LogoutButton() {
  const handleLogout = async () => {
    await fetch("/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    window.location.href = "/login";
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
    >
      Logout
    </button>
  );
}
