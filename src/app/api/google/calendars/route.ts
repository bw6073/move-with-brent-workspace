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
    const access_token = (patch as any).access_token as string | undefined;
    const expiry = (patch as any).expiry as string | undefined;
    if (!access_token || !expiry) return;

    await supabase
      .from("google_accounts")
      .update({
        access_token,
        expiry,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
  });

  // Only calendars we can write to
  const resp = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "Failed to load calendars" },
      { status: 500 }
    );
  }

  const calendars = (data.items ?? []).map((c: any) => ({
    id: String(c.id),
    summary: String(c.summary ?? "Untitled calendar"),
    primary: Boolean(c.primary),
  }));

  return NextResponse.json({ calendars }, { status: 200 });
}
