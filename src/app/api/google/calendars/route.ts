import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refreshGoogleToken } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data: gacc, error: gerr } = await supabase
    .from("google_accounts")
    .select("user_id, access_token, refresh_token, expiry")
    .eq("user_id", user.id)
    .single();

  if (gerr || !gacc) {
    return NextResponse.json(
      { error: "Google Calendar not connected" },
      { status: 400 }
    );
  }

  const accessToken = await refreshGoogleToken(gacc as any, async (patch) => {
    await supabase
      .from("google_accounts")
      .update({
        access_token: patch.access_token,
        expiry: patch.expiry,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
  });

  const resp = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );

  const data = await resp.json();
  if (!resp.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "Failed to load calendars" },
      { status: 500 }
    );
  }

  const calendars = (data.items ?? []).map((c: any) => ({
    id: c.id as string,
    summary: c.summary as string,
    primary: Boolean(c.primary),
  }));

  return NextResponse.json({ calendars }, { status: 200 });
}
