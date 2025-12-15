// app/api/open-homes/[eventId]/attendees/[attendeeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ eventId: string; attendeeId: string }> }
) {
  const { eventId, attendeeId } = await context.params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("open_home_attendees")
    .delete()
    .eq("id", attendeeId)
    .eq("event_id", eventId)
    .select("id")
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
