// app/api/open-homes/[eventId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ eventId: string }> };

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
  const endDate = endAt ? new Date(endAt) : null;

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
    .eq("user_id", user.id) // ✅ defence in depth
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error updating open home", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  if (!data) {
    // Either not found OR not owned (RLS + this filter)
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
    .maybeSingle();

  if (error) {
    console.error("Error deleting open home", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Open home not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
