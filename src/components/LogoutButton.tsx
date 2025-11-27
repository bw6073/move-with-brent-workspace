"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const supabase = supabaseBrowser();
      await supabase.auth.signOut();
      // Clear local UI state by sending back to login
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
      alert("There was a problem logging out.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
    >
      {loading ? "Logging out…" : "Logout"}
    </button>
  );
}
