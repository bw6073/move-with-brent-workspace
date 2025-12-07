// app/api/open-homes/[eventId]/attendees/[attendeeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ eventId: string; attendeeId: string }> }
) {
  const { eventId, attendeeId } = await context.params;
  const supabase = await createClient();

  const body = await req.json();
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

  if (firstName !== undefined) updates.first_name = firstName.trim();
  if (lastName !== undefined) updates.last_name = lastName.trim();
  if (phone !== undefined) updates.phone = phone.trim() || null;
  if (email !== undefined) updates.email = email.trim() || null;
  if (leadSource !== undefined) updates.lead_source = leadSource || null;
  if (leadSourceOther !== undefined)
    updates.lead_source_other = leadSourceOther || null;
  if (isBuyer !== undefined) updates.is_buyer = !!isBuyer;
  if (isSeller !== undefined) updates.is_seller = !!isSeller;
  if (researchVisit !== undefined) updates.research_visit = !!researchVisit;
  if (mailingListOptIn !== undefined)
    updates.mailing_list_opt_in = !!mailingListOptIn;
  if (notes !== undefined) updates.notes = notes.trim() ? notes.trim() : null;

  const { data, error } = await supabase
    .from("open_home_attendees")
    .update(updates)
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

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ eventId: string; attendeeId: string }> }
) {
  const { eventId, attendeeId } = await context.params;
  const supabase = await createClient();

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

  return NextResponse.json({ success: true }, { status: 204 });
}
