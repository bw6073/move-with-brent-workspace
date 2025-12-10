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
  // ✅ unwrap params the Next 16 way
  const { eventId } = await context.params;

  try {
    const supabase = await createClient();
    const body = (await req.json()) as AttendeePayload;

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

    const { data, error } = await supabase
      .from("open_home_attendees")
      .insert({
        event_id: eventId,
        property_id: propertyIdNum,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        lead_source: leadSource || null,
        lead_source_other:
          leadSource === "Other" ? leadSourceOther || null : null,
        is_buyer: !!isBuyer,
        is_seller: !!isSeller,
        research_visit: !!researchVisit,
        mailing_list_opt_in:
          mailingListOptIn === undefined ? true : !!mailingListOptIn,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        {
          error: "Insert failed",
          supabaseError: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ attendee: data }, { status: 201 });
  } catch (err) {
    console.error("Unhandled error in attendees route:", err);
    return NextResponse.json(
      {
        error: "Unhandled server error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
