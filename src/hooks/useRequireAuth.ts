"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
// If you want proper typing, you can also:
// import type { User } from "@supabase/supabase-js";

type UseRequireAuthResult = {
  user: any | null; // or `User | null` if you import the type
  checking: boolean;
};

export function useRequireAuth(): UseRequireAuthResult {
  const [user, setUser] = useState<any | null>(null);
  const [checking, setChecking] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const check = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error("Error checking auth:", error);
      }

      if (!data.user) {
        // Optional: honour ?redirect=... from the URL
        const redirect = searchParams?.get("redirect") || "/appraisals";

        router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }

      setUser(data.user);
      setChecking(false);
    };

    check();
  }, [router, searchParams]);

  return { user, checking };
}
