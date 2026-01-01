// src/app/api/appraisals/[id]/sync-calendar/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  refreshGoogleToken,
} from "@/lib/google/calendar";
import { googleEventFromAppraisal } from "@/lib/appraisals/googleEventFromAppraisal";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // Load appraisal (RLS should ensure ownership)
  const { data: appraisal, error: appraisalErr } = await supabase
    .from("appraisals")
    .select("*")
    .eq("id", id)
    .single();

  if (appraisalErr || !appraisal) {
    return NextResponse.json(
      { error: appraisalErr?.message || "Appraisal not found" },
      { status: 404 }
    );
  }

  // Load google account
  const { data: gacc, error: gerr } = await supabase
    .from("google_accounts")
    .select(
      "user_id, calendar_id, appraisals_calendar_id, access_token, refresh_token, expiry"
    )
    .eq("user_id", user.id)
    .single();

  if (gerr || !gacc) {
    return NextResponse.json(
      { error: "Google Calendar not connected" },
      { status: 400 }
    );
  }

  // Refresh token if needed
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

  // Build event from appraisal
  let event;
  try {
    event = googleEventFromAppraisal(appraisal);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  // Create or update event
  const calendarId =
    (gacc as any).appraisals_calendar_id ||
    (gacc as any).calendar_id ||
    "primary";

  try {
    if (appraisal.google_event_id) {
      const updated = await updateGoogleCalendarEvent({
        accessToken,
        calendarId,
        eventId: appraisal.google_event_id,
        event,
      });

      return NextResponse.json({
        ok: true,
        google_event_id: updated.id,
      });
    } else {
      const created = await createGoogleCalendarEvent({
        accessToken,
        calendarId,
        event,
      });

      // Store google_event_id
      const { error: uerr } = await supabase
        .from("appraisals")
        .update({ google_event_id: created.id })
        .eq("id", id);

      if (uerr) {
        return NextResponse.json(
          { error: "Event created but failed to save google_event_id" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        google_event_id: created.id,
      });
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Calendar sync failed" },
      { status: 500 }
    );
  }
}
