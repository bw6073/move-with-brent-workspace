// app/api/open-homes/[eventId]/attendees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LeadSource =
  | "realestate.com.au"
  | "Domain"
  | "REIWA"
  | "Brookwood site"
  | "Social"
  | "Signboard"
  | "Referral"
  | "Other";

interface AttendeePayload {
  propertyId: number | string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  leadSource?: LeadSource;
  leadSourceOther?: string;
  isBuyer?: boolean;
  isSeller?: boolean;
  researchVisit?: boolean;
  mailingListOptIn?: boolean;
  notes?: string;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // ✅ Ensure the event exists AND is owned by this user
  const { data: event, error: eventError } = await supabase
    .from("open_home_events")
    .select("id, property_id")
    .eq("id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (eventError) {
    console.error("Error loading open home for attendee insert", eventError);
    return NextResponse.json(
      { error: "Failed to load open home" },
      { status: 500 }
    );
  }

  if (!event) {
    return NextResponse.json({ error: "Open home not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<AttendeePayload>;

  const {
    propertyId,
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

  if (!propertyId || !firstName?.trim() || !lastName?.trim()) {
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

  // ✅ Strong sanity check: property must match the event property
  if (propertyIdNum !== event.property_id) {
    return NextResponse.json(
      { error: "Property does not match open home" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("open_home_attendees")
    .insert({
      user_id: user.id,
      event_id: eventId,
      property_id: propertyIdNum,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: typeof phone === "string" ? phone.trim() || null : null,
      email: typeof email === "string" ? email.trim() || null : null,
      lead_source: (leadSource as string) || null,
      lead_source_other:
        leadSource === "Other"
          ? typeof leadSourceOther === "string"
            ? leadSourceOther.trim() || null
            : null
          : null,
      is_buyer: !!isBuyer,
      is_seller: !!isSeller,
      research_visit: !!researchVisit,
      mailing_list_opt_in:
        mailingListOptIn === undefined ? true : !!mailingListOptIn,
      notes: typeof notes === "string" ? notes.trim() || null : null,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase insert attendee error:", error);
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ attendee: data }, { status: 201 });
}
