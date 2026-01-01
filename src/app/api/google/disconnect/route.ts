import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { error } = await supabase
    .from("google_accounts")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("Error disconnecting Google account", error);
    return NextResponse.json({ error: "Disconnect failed" }, { status: 500 });
  }

  // Optional: clear google_event_id on open homes for this user
  // await supabase.from("open_home_events").update({ google_event_id: null }).eq("user_id", user.id);

  return NextResponse.json({ ok: true }, { status: 200 });
}
