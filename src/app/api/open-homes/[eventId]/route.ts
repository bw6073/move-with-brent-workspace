// app/api/open-homes/[eventId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  deleteGoogleCalendarEvent,
  refreshGoogleToken,
} from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ eventId: string }> };

type OpenHomeRow = { id: number; google_event_id: string | null };

type GoogleAccountRow = {
  calendar_id: string | null;
  open_homes_calendar_id: string | null;
  access_token: string;
  refresh_token: string | null;
  expiry: string;
};

// ───────────────── PATCH ─────────────────
export async function PATCH(req: NextRequest, context: Context) {
  const { eventId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as any));
  const { propertyId, title, startAt, endAt, notes } = body;

  if (!propertyId || !startAt) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const propertyIdNum = Number(propertyId);
  if (!Number.isFinite(propertyIdNum)) {
    return NextResponse.json(
      { error: "Invalid propertyId", value: propertyId },
      { status: 400 }
    );
  }

  const startDate = new Date(startAt);
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "Invalid startAt" }, { status: 400 });
  }

  const endDate = endAt ? new Date(endAt) : null;
  if (endAt && endDate && Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Invalid endAt" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("open_home_events")
    .update({
      property_id: propertyIdNum,
      title: typeof title === "string" ? title.trim() || null : null,
      start_at: startDate.toISOString(),
      end_at: endDate ? endDate.toISOString() : null,
      notes: typeof notes === "string" ? notes.trim() || null : null,
    })
    .eq("id", eventId)
    .eq("user_id", user.id) // defence in depth
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error updating open home", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Open home not found" }, { status: 404 });
  }

  return NextResponse.json({ event: data }, { status: 200 });
}

// ───────────────── DELETE ─────────────────
export async function DELETE(_req: NextRequest, context: Context) {
  const { eventId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // 0) Load the open home first (to get google_event_id)
  const { data: eventRow, error: loadErr } = await supabase
    .from("open_home_events")
    .select("id, google_event_id")
    .eq("id", eventId)
    .eq("user_id", user.id)
    .maybeSingle<OpenHomeRow>();

  if (loadErr) {
    console.error("Error loading open home before delete", loadErr);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  if (!eventRow) {
    return NextResponse.json({ error: "Open home not found" }, { status: 404 });
  }

  // 0b) If linked, attempt to delete the Google Calendar event (non-blocking)
  if (eventRow.google_event_id) {
    const { data: gacc, error: gerr } = await supabase
      .from("google_accounts")
      .select(
        "calendar_id, open_homes_calendar_id, access_token, refresh_token, expiry"
      )
      .eq("user_id", user.id)
      .single<GoogleAccountRow>();

    if (!gerr && gacc) {
      try {
        const accessToken = await refreshGoogleToken(
          gacc as any,
          async (patch) => {
            await supabase
              .from("google_accounts")
              .update({
                access_token: patch.access_token,
                expiry: patch.expiry,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", user.id);
          }
        );

        const calendarId =
          gacc.open_homes_calendar_id || gacc.calendar_id || "primary";

        await deleteGoogleCalendarEvent({
          accessToken,
          calendarId,
          eventId: eventRow.google_event_id,
        });
      } catch (e) {
        // Don't block CRM deletion if Google delete fails
        console.warn("Failed to delete Google Calendar event", e);
      }
    }
  }

  // 1) Delete attendees for this event (scoped)
  const { error: attendeesError } = await supabase
    .from("open_home_attendees")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id);

  if (attendeesError) {
    console.error("Error deleting attendees for open home", attendeesError);
    return NextResponse.json(
      { error: "Failed to delete attendees" },
      { status: 500 }
    );
  }

  // 2) Delete event itself (scoped)
  const { data, error } = await supabase
    .from("open_home_events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle<{ id: number }>();

  if (error) {
    console.error("Error deleting open home", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Open home not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
