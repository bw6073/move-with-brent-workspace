// app/api/open-homes/[eventId]/attendees/[attendeeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ eventId: string; attendeeId: string }> };

async function requireOwnedEvent(
  supabase: any,
  eventId: string,
  userId: string
) {
  const { data: event, error } = await supabase
    .from("open_home_events")
    .select("id")
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error checking event ownership", error);
    return { ok: false as const, status: 500 as const };
  }

  if (!event) {
    return { ok: false as const, status: 404 as const };
  }

  return { ok: true as const };
}

export async function PATCH(req: NextRequest, context: Ctx) {
  const { eventId, attendeeId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // ✅ Ensure the parent event exists + is owned
  const owned = await requireOwnedEvent(supabase, eventId, user.id);
  if (!owned.ok) {
    return NextResponse.json(
      { error: owned.status === 404 ? "Open home not found" : "Server error" },
      { status: owned.status }
    );
  }

  const body = (await req.json().catch(() => ({}))) as any;

  const {
    firstName,
    lastName,
    phone,
    email,
    leadSource,
    leadSourceOther,
    isBuyer,
    isSeller,
    researchVisit,
    mailingListOptIn,
    notes,
  } = body;

  const updates: Record<string, any> = {};

  if (typeof firstName === "string")
    updates.first_name = firstName.trim() || null;
  if (typeof lastName === "string") updates.last_name = lastName.trim() || null;

  if (typeof phone === "string") updates.phone = phone.trim() || null;
  if (phone === null) updates.phone = null;

  if (typeof email === "string") updates.email = email.trim() || null;
  if (email === null) updates.email = null;

  if (typeof leadSource === "string") updates.lead_source = leadSource || null;
  if (leadSource === null) updates.lead_source = null;

  // Only keep lead_source_other when leadSource is "Other"
  if (leadSource === "Other") {
    updates.lead_source_other =
      typeof leadSourceOther === "string"
        ? leadSourceOther.trim() || null
        : null;
  } else if (leadSource !== undefined) {
    updates.lead_source_other = null;
  }

  if (typeof isBuyer === "boolean") updates.is_buyer = isBuyer;
  if (typeof isSeller === "boolean") updates.is_seller = isSeller;
  if (typeof researchVisit === "boolean")
    updates.research_visit = researchVisit;
  if (typeof mailingListOptIn === "boolean")
    updates.mailing_list_opt_in = mailingListOptIn;

  if (typeof notes === "string") updates.notes = notes.trim() || null;
  if (notes === null) updates.notes = null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("open_home_attendees")
    .update(updates)
    .eq("id", attendeeId)
    .eq("event_id", eventId)
    .eq("user_id", user.id) // ✅ defence in depth
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error updating attendee", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
  }

  return NextResponse.json({ attendee: data }, { status: 200 });
}

export async function DELETE(_req: NextRequest, context: Ctx) {
  const { eventId, attendeeId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // ✅ Ensure the parent event exists + is owned
  const owned = await requireOwnedEvent(supabase, eventId, user.id);
  if (!owned.ok) {
    return NextResponse.json(
      { error: owned.status === 404 ? "Open home not found" : "Server error" },
      { status: owned.status }
    );
  }

  const { data, error } = await supabase
    .from("open_home_attendees")
    .delete()
    .eq("id", attendeeId)
    .eq("event_id", eventId)
    .eq("user_id", user.id) // ✅ defence in depth
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Error deleting attendee", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
