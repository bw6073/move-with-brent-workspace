// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function createClient() {
  // ✅ In Next 16, cookies() is async – you MUST await it
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // ✅ Read-only cookie access for server components / layouts / pages
        get(name: string) {
          return cookieStore.get(name)?.value;
        },

        // ⛔ No-ops to avoid "Cannot set cookie inside server action" warnings
        set(_name: string, _value: string, _options: CookieOptions): void {
          // intentionally left blank
        },

        remove(_name: string, _options: CookieOptions): void {
          // intentionally left blank
        },
      },
    }
  );
}
