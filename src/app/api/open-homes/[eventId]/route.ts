// app/api/open-homes/[eventId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

// ✅ PATCH: update an open home
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
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
      .single();

    if (error) {
      console.error("Error updating open_home_event", error);
      return NextResponse.json(
        { error: "Update failed", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ event: data }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in PATCH /api/open-homes/[eventId]", err);
    return NextResponse.json(
      { error: "Unexpected server error updating open home" },
      { status: 500 }
    );
  }
}

// ✅ DELETE: delete attendees, then the event
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;
    const supabase = await createClient();

    // 1) Delete attendees for this event
    const { error: attendeesError } = await supabase
      .from("open_home_attendees")
      .delete()
      .eq("event_id", eventId);

    if (attendeesError) {
      console.error(
        "Error deleting attendees for event",
        eventId,
        attendeesError
      );
      return NextResponse.json(
        {
          error: "Failed to delete attendees for this open home",
          supabaseError: attendeesError,
        },
        { status: 500 }
      );
    }

    // 2) Delete the event itself
    const { error: eventError } = await supabase
      .from("open_home_events")
      .delete()
      .eq("id", eventId);

    if (eventError) {
      console.error("Error deleting open_home_event", eventId, eventError);
      return NextResponse.json(
        {
          error: "Failed to delete this open home",
          supabaseError: eventError,
        },
        { status: 500 }
      );
    }

    // 3) All good – proper 204 with no body
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Unexpected error in DELETE /api/open-homes/[eventId]", err);
    return NextResponse.json(
      { error: "Unexpected server error deleting open home" },
      { status: 500 }
    );
  }
}
