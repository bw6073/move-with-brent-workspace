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

type GoogleAccountRow = {
  user_id: string;
  calendar_id: string | null;
  appraisals_calendar_id: string | null;
  access_token: string;
  refresh_token: string | null;
  expiry: string;
};

function parseId(raw: string) {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await ctx.params;
  const appraisalId = parseId(rawId);

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

  // 1) Load appraisal (scoped)
  // NOTE: include data (JSON) because most appraisal fields live there.
  const { data: appraisalRow, error: appraisalErr } = await supabase
    .from("appraisals")
    .select("id, user_id, google_event_id, data")
    .eq("id", appraisalId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (appraisalErr) {
    console.error("[sync appraisal] load error", appraisalErr);
    return NextResponse.json(
      { error: "Failed to load appraisal" },
      { status: 500 }
    );
  }

  if (!appraisalRow) {
    return NextResponse.json({ error: "Appraisal not found" }, { status: 404 });
  }

  // 2) Load google account connection
  const { data: gacc, error: gerr } = await supabase
    .from("google_accounts")
    .select(
      "user_id, calendar_id, appraisals_calendar_id, access_token, refresh_token, expiry"
    )
    .eq("user_id", user.id)
    .maybeSingle<GoogleAccountRow>();

  if (gerr) {
    console.error("[sync appraisal] google_accounts error", gerr);
    return NextResponse.json(
      { error: "Failed to load Google connection" },
      { status: 500 }
    );
  }

  if (!gacc) {
    return NextResponse.json(
      { error: "Google Calendar not connected" },
      { status: 400 }
    );
  }

  // 3) Refresh token if needed
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

  // 4) Flatten appraisal fields for the mapper:
  // - keep real ids from DB
  // - overlay JSON `data` so googleEventFromAppraisal can find appointment_at etc.
  const flattenedAppraisal = {
    id: appraisalRow.id,
    user_id: appraisalRow.user_id,
    google_event_id: appraisalRow.google_event_id ?? null,
    ...(typeof appraisalRow.data === "object" && appraisalRow.data
      ? appraisalRow.data
      : {}),
  };

  // 5) Build event
  let event: any;
  try {
    event = googleEventFromAppraisal(flattenedAppraisal);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Invalid appraisal data" },
      { status: 400 }
    );
  }

  // 6) Choose target calendar
  const calendarId =
    gacc.appraisals_calendar_id || gacc.calendar_id || "primary";

  // 7) Create or update
  try {
    if (appraisalRow.google_event_id) {
      const updated = await updateGoogleCalendarEvent({
        accessToken,
        calendarId,
        eventId: appraisalRow.google_event_id,
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
      .eq("id", appraisalRow.id)
      .eq("user_id", user.id);

    if (uerr) {
      console.error("[sync appraisal] failed saving google_event_id", uerr);
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
