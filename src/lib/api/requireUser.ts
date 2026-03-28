import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

type AuthSuccess = { user: { id: string }; supabase: SupabaseClient; errorResponse: null };
type AuthFailure = { user: null; supabase: null; errorResponse: NextResponse };

export async function requireUser(): Promise<AuthSuccess | AuthFailure> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      supabase: null,
      errorResponse: NextResponse.json({ error: "Unauthorised" }, { status: 401 }),
    };
  }

  return { user: { id: user.id }, supabase, errorResponse: null };
}
