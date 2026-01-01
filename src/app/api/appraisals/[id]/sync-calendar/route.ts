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

function parseId(id: string) {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const appraisalId = parseId(id);

  if (!appraisalId) {
    return NextResponse.json(
      { error: "Invalid appraisal id" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // Load appraisal (scoped)
  const { data: appraisal, error: appraisalErr } = await supabase
    .from("appraisals")
    .select("*")
    .eq("id", appraisalId)
    .eq("user_id", user.id)
    .maybeSingle();

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
    .maybeSingle();

  if (gerr || !gacc) {
    return NextResponse.json(
      { error: "Google Calendar not connected" },
      { status: 400 }
    );
  }

  // Refresh token if needed
  const accessToken = await refreshGoogleToken(gacc as any, async (patch) => {
    const access_token = (patch as any)?.access_token as string | undefined;
    const expiry = (patch as any)?.expiry as string | undefined;
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

  // Build event
  let event: any;
  try {
    event = googleEventFromAppraisal(appraisal);
  } catch (e: any) {
    // 👇 return useful debug so we can see what the server is receiving
    const debug = {
      appraisalId: appraisal.id,
      hasData: Boolean((appraisal as any)?.data),
      followUpAt: (appraisal as any)?.data?.followUpAt ?? null,
      followUpDate: (appraisal as any)?.data?.followUpDate ?? null,
      topLevelAppointmentAt: (appraisal as any)?.appointment_at ?? null,
    };

    return NextResponse.json(
      { error: e?.message || "Invalid appraisal data", debug },
      { status: 400 }
    );
  }

  const calendarId =
    (gacc as any).appraisals_calendar_id ||
    (gacc as any).calendar_id ||
    "primary";

  try {
    if ((appraisal as any).google_event_id) {
      const updated = await updateGoogleCalendarEvent({
        accessToken,
        calendarId,
        eventId: (appraisal as any).google_event_id,
        event,
      });

      return NextResponse.json({ ok: true, google_event_id: updated.id });
    }

    const created = await createGoogleCalendarEvent({
      accessToken,
      calendarId,
      event,
    });

    const { error: uerr } = await supabase
      .from("appraisals")
      .update({ google_event_id: created.id })
      .eq("id", appraisalId)
      .eq("user_id", user.id);

    if (uerr) {
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
