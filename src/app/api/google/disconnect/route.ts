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

  // ✅ Cleanup: prevent stale google_event_id references
  const { error: clearErr } = await supabase
    .from("open_home_events")
    .update({ google_event_id: null })
    .eq("user_id", user.id);

  if (clearErr) {
    console.error("Error clearing google_event_id on open homes", clearErr);
    // Not fatal — account is disconnected — but worth surfacing
    return NextResponse.json(
      { error: "Disconnected, but failed to clear open home sync state" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
