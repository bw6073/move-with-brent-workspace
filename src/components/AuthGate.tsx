// src/components/AuthGate.tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  children: ReactNode;
};

export default function AuthGate({ children }: Props) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (cancelled) return;

      if (error || !data.user) {
        // Not logged in → send to login with redirect back to this page
        const redirectTo = pathname || "/appraisals";
        router.replace(`/login?redirect=${encodeURIComponent(redirectTo)}`);
        return;
      }

      setChecking(false);
    };

    check();

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-600">Checking your session…</p>
      </main>
    );
  }

  return <>{children}</>;
}
