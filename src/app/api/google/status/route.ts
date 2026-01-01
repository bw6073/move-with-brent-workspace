// src/app/api/google/status/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }

  const { data } = await supabase
    .from("google_accounts")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json(
    { connected: Boolean(data?.user_id) },
    { status: 200 }
  );
}
