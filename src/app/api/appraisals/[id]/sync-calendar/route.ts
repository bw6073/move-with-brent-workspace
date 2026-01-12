// src/app/api/appraisals/[id]/sync-calendar/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  refreshGoogleToken,
  type GoogleAccount,
} from "@/lib/google/calendar";
import { googleEventFromAppraisal } from "@/lib/appraisals/googleEventFromAppraisal";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

type AppraisalRow = {
  id: number;
  user_id: string;
  google_event_id: string | null;
  data: Record<string, any> | null;
};

type GoogleAccountRow = GoogleAccount & {
  appraisals_calendar_id?: string | null;
};

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function isGoogleAuthExpired(msg: string) {
  const m = msg.toLowerCase();
  return (
    m.includes("invalid_grant") ||
    m.includes("invalid credentials") ||
    m.includes("token has been expired") ||
    m.includes("revoked") ||
    m.includes("insufficient authentication scopes") ||
    m.includes("insufficient permission") ||
    m.includes("unauthorized")
  );
}

export async function POST(_req: Request, ctx: Ctx) {
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

  // 1) Load appraisal (scoped to user)
  const { data: appraisal, error: appraisalErr } = await supabase
    .from("appraisals")
    .select("id, user_id, google_event_id, data")
    .eq("id", appraisalId)
    .eq("user_id", user.id)
    .maybeSingle<AppraisalRow>();

  if (appraisalErr) {
    console.error("[sync-calendar] load appraisal error", appraisalErr);
    return NextResponse.json(
      { error: "Failed to load appraisal" },
      { status: 500 }
    );
  }

  if (!appraisal) {
    return NextResponse.json({ error: "Appraisal not found" }, { status: 404 });
  }

  // 2) Load Google connection
  const { data: gacc, error: gerr } = await supabase
    .from("google_accounts")
    .select(
      "user_id, calendar_id, appraisals_calendar_id, access_token, refresh_token, expiry"
    )
    .eq("user_id", user.id)
    .maybeSingle<GoogleAccountRow>();

  if (gerr) {
    console.error("[sync-calendar] load google account error", gerr);
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

  // 3) Refresh token if needed (and persist new tokens)
  let accessToken: string;
  try {
    accessToken = await refreshGoogleToken(gacc, async (patch) => {
      await supabase
        .from("google_accounts")
        .update({
          access_token: patch.access_token,
          expiry: patch.expiry,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    });
  } catch (e: any) {
    const msg = e?.message || "Failed to refresh Google token";
    const status = isGoogleAuthExpired(msg) ? 409 : 500;
    return NextResponse.json(
      {
        error: isGoogleAuthExpired(msg)
          ? "Google connection expired. Please reconnect."
          : msg,
      },
      { status }
    );
  }

  // 4) Build Google event from appraisal
  let event;
  try {
    event = googleEventFromAppraisal(appraisal as any);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Invalid appraisal data" },
      { status: 400 }
    );
  }

  const calendarId =
    gacc.appraisals_calendar_id || gacc.calendar_id || "primary";

  // 5) Create or update Google event
  try {
    if (appraisal.google_event_id) {
      const updated = await updateGoogleCalendarEvent({
        accessToken,
        calendarId,
        eventId: appraisal.google_event_id,
        event,
      });

      return NextResponse.json(
        { ok: true, google_event_id: updated.id },
        { status: 200 }
      );
    }

    const created = await createGoogleCalendarEvent({
      accessToken,
      calendarId,
      event,
    });

    const { error: saveErr } = await supabase
      .from("appraisals")
      .update({ google_event_id: created.id })
      .eq("id", appraisalId)
      .eq("user_id", user.id);

    if (saveErr) {
      console.error(
        "[sync-calendar] created event but failed to save google_event_id",
        saveErr
      );
      return NextResponse.json(
        { error: "Event created but failed to save google_event_id" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, google_event_id: created.id },
      { status: 200 }
    );
  } catch (e: any) {
    const msg = e?.message || "Calendar sync failed";
    const status = isGoogleAuthExpired(msg) ? 409 : 500;

    return NextResponse.json(
      {
        error: isGoogleAuthExpired(msg)
          ? "Google connection expired. Please reconnect."
          : msg,
      },
      { status }
    );
  }
}
