// app/api/open-homes/[eventId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ eventId: string }> };

// ───────────────── PATCH ─────────────────
export async function PATCH(req: NextRequest, context: Context) {
  const { eventId } = await context.params;
  const supabase = await createClient();

  const body = await req.json();
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
      title: title?.trim() || null,
      start_at: startDate.toISOString(),
      end_at: endDate ? endDate.toISOString() : null,
      notes: notes?.trim() || null,
    })
    .eq("id", eventId)
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

  await supabase.from("open_home_attendees").delete().eq("event_id", eventId);

  const { data, error } = await supabase
    .from("open_home_events")
    .delete()
    .eq("id", eventId)
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
