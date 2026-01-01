import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { openHomesCalendarId, appraisalsCalendarId } = body;

  const { error } = await supabase
    .from("google_accounts")
    .update({
      open_homes_calendar_id:
        typeof openHomesCalendarId === "string" ? openHomesCalendarId : null,
      appraisals_calendar_id:
        typeof appraisalsCalendarId === "string" ? appraisalsCalendarId : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to save calendar preferences" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
