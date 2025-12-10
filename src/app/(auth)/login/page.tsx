// src/app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    await supabase.auth.signInWithPassword({ email, password });
    window.location.href = "/"; // goes to dashboard
  }

  return (
    <form
      onSubmit={handleLogin}
      className="w-full max-w-sm mx-auto bg-white p-6 rounded-xl shadow"
    >
      <h1 className="text-lg font-semibold mb-4">Sign in</h1>

      <input
        type="email"
        placeholder="Email"
        className="w-full border rounded px-3 py-2 mb-2"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full border rounded px-3 py-2 mb-4"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button className="w-full bg-slate-900 text-white py-2 rounded-lg">
        Sign in
      </button>
    </form>
  );
}
