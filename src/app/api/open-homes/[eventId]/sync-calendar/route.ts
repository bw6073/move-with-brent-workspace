// src/app/api/open-homes/[eventId]/sync-calendar/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/requireUser";
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  refreshGoogleToken,
} from "@/lib/google/calendar";
import { googleEventFromOpenHome } from "@/lib/open-homes/googleEventFromOpenHome";

export const dynamic = "force-dynamic";

type OpenHomeRow = {
  id: number;
  user_id: string;
  property_id: number;
  title: string | null;
  start_at: string;
  end_at: string | null;
  notes: string | null;
  google_event_id: string | null;
  property: {
    street_address: string;
    suburb: string;
    state: string;
    postcode: string;
  } | null;
};

type GoogleAccountRow = {
  user_id: string;
  calendar_id: string;
  open_homes_calendar_id: string | null;
  access_token: string;
  refresh_token: string | null;
  expiry: string;
};

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await ctx.params;

  const { user, supabase, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  // 1) Load open home + property (scoped to user)
  const { data: openHome, error: ohErr } = await supabase
    .from("open_home_events")
    .select(
      `
      id,
      user_id,
      property_id,
      title,
      start_at,
      end_at,
      notes,
      google_event_id,
      property:properties (
        street_address,
        suburb,
        state,
        postcode
      )
    `
    )
    .eq("id", eventId)
    .eq("user_id", user.id)
    .single<OpenHomeRow>();

  if (ohErr || !openHome) {
    return NextResponse.json(
      { error: ohErr?.message || "Open home not found" },
      { status: 404 }
    );
  }

  // 2) Load Google connection
  const { data: gacc, error: gerr } = await supabase
    .from("google_accounts")
    .select(
      "user_id, calendar_id, open_homes_calendar_id, access_token, refresh_token, expiry"
    )
    .eq("user_id", user.id)
    .single<GoogleAccountRow>();

  if (gerr || !gacc) {
    return NextResponse.json(
      { error: "Google Calendar not connected" },
      { status: 400 }
    );
  }

  // 3) Refresh token if needed
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

  // 4) Build Google event
  let event;
  try {
    event = googleEventFromOpenHome(openHome);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Invalid open home data" },
      { status: 400 }
    );
  }

  const calendarId =
    gacc.open_homes_calendar_id || gacc.calendar_id || "primary";

  // 5) Create or update
  try {
    if (openHome.google_event_id) {
      const updated = await updateGoogleCalendarEvent({
        accessToken,
        calendarId,
        eventId: openHome.google_event_id,
        event,
      });

      return NextResponse.json({ ok: true, google_event_id: updated.id });
    }

    const created = await createGoogleCalendarEvent({
      accessToken,
      calendarId,
      event,
    });

    const { error: saveErr } = await supabase
      .from("open_home_events")
      .update({ google_event_id: created.id })
      .eq("id", openHome.id)
      .eq("user_id", user.id);

    if (saveErr) {
      return NextResponse.json(
        { error: "Event created but failed to save google_event_id" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, google_event_id: created.id });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Calendar sync failed" },
      { status: 500 }
    );
  }
}
