import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// DELETE /api/open-homes/:eventId/attendees/:attendeeId
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ eventId: string; attendeeId: string }> }
) {
  const { eventId, attendeeId } = await context.params;

  const supabase = await createClient();

  // Delete just this attendee tied to this event
  const { error } = await supabase
    .from("open_home_attendees")
    .delete()
    .eq("id", attendeeId)
    .eq("event_id", eventId);

  if (error) {
    console.error("Error deleting attendee", error);
    return NextResponse.json(
      { error: "Delete failed", supabaseError: error },
      { status: 500 }
    );
  }

  // No body needed – 204 = success, no content
  return new NextResponse(null, { status: 204 });
}

// Optional: PATCH is already working, but if you want it all in one file:
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ eventId: string; attendeeId: string }> }
) {
  const { attendeeId, eventId } = await context.params;
  const supabase = await createClient();
  const body = await req.json();

  const { phone, email, notes } = body;

  const { data, error } = await supabase
    .from("open_home_attendees")
    .update({
      phone: phone ?? null,
      email: email ?? null,
      notes: notes ?? null,
    })
    .eq("id", attendeeId)
    .eq("event_id", eventId)
    .select()
    .single();

  if (error) {
    console.error("Error updating attendee", error);
    return NextResponse.json(
      { error: "Update failed", supabaseError: error },
      { status: 500 }
    );
  }

  return NextResponse.json({ attendee: data }, { status: 200 });
}
