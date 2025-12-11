// src/app/api/open-homes/[eventId]/attendees/[attendeeId]/convert-to-contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    eventId: string;
    attendeeId: string;
  }>;
};

type AttendeeRow = {
  id: string;
  event_id: string;
  property_id: number | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  lead_source: string | null;
  lead_source_other: string | null;
  is_buyer: boolean | null;
  is_seller: boolean | null;
  research_visit: boolean | null;
  mailing_list_opt_in: boolean | null;
  notes: string | null;
  contact_id: number | null;
};

type ContactCandidateRow = {
  id: number;
  phone: string | null;
  phone_mobile: string | null;
  email: string | null;
};

function normalisePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  return digits.length ? digits : null;
}

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { eventId, attendeeId } = await context.params;
    const supabase = await createClient();

    // ───────────────── AUTH ─────────────────
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "No authenticated user in convert-to-contact endpoint",
        userError
      );
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // ───────────────── 1) LOAD ATTENDEE ─────────────────
    const { data: attendeeData, error: attendeeError } = await supabase
      .from("open_home_attendees")
      .select(
        `
        id,
        event_id,
        property_id,
        first_name,
        last_name,
        phone,
        email,
        lead_source,
        lead_source_other,
        is_buyer,
        is_seller,
        research_visit,
        mailing_list_opt_in,
        notes,
        contact_id
      `
      )
      .eq("id", attendeeId)
      .eq("event_id", eventId)
      .maybeSingle();

    const attendee = attendeeData as AttendeeRow | null;

    if (attendeeError || !attendee) {
      console.error(
        "convert-to-contact: failed to load attendee",
        attendeeError
      );
      return NextResponse.json(
        { error: "Attendee not found" },
        { status: 404 }
      );
    }

    // Already linked? Just return the existing contact id.
    if (attendee.contact_id) {
      return NextResponse.json({
        contactId: attendee.contact_id,
        alreadyLinked: true,
      });
    }

    const normalisedPhone = normalisePhone(attendee.phone);
    const email =
      attendee.email && attendee.email.trim().length > 0
        ? attendee.email.trim().toLowerCase()
        : null;

    // ───────────────── 2) TRY TO FIND EXISTING CONTACT ─────────────────
    let existingContactId: number | null = null;

    if (normalisedPhone || email) {
      const { data: candidatesData, error: candidatesError } = await supabase
        .from("contacts")
        .select("id, phone, phone_mobile, email")
        .eq("user_id", user.id);

      if (candidatesError) {
        console.error(
          "convert-to-contact: error loading contact candidates",
          candidatesError
        );
      } else {
        const candidates = (candidatesData ?? []) as ContactCandidateRow[];

        const match = candidates.find((c) => {
          const cPhoneDigits = normalisePhone(c.phone_mobile || c.phone);
          const emailMatch =
            email && c.email && c.email.toLowerCase() === email;
          const phoneMatch =
            normalisedPhone && cPhoneDigits && cPhoneDigits === normalisedPhone;

          return Boolean(emailMatch || phoneMatch);
        });

        if (match) {
          existingContactId = match.id;
        }
      }
    }

    let finalContactId: number;

    if (existingContactId) {
      // ── 3a) LINK TO EXISTING CONTACT ──
      const { error: linkError } = await supabase
        .from("open_home_attendees")
        .update({ contact_id: existingContactId })
        .eq("id", attendee.id);

      if (linkError) {
        console.error(
          "convert-to-contact: failed to link attendee to existing contact",
          linkError
        );
        return NextResponse.json(
          {
            error: "Failed to link attendee to existing contact",
            supabaseError: linkError,
          },
          { status: 500 }
        );
      }

      finalContactId = existingContactId;
    } else {
      // ── 3b) CREATE NEW CONTACT ──
      const fullName = [attendee.first_name?.trim(), attendee.last_name?.trim()]
        .filter(Boolean)
        .join(" ")
        .trim();

      const displayName =
        fullName ||
        attendee.first_name ||
        attendee.last_name ||
        "Open home lead";

      const phoneToStore = attendee.phone || null;

      const { data: newContact, error: insertError } = await supabase
        .from("contacts")
        .insert({
          user_id: user.id,

          // main name + breakdown
          name: displayName,
          first_name: attendee.first_name || null,
          last_name: attendee.last_name || null,

          email: attendee.email || null,

          // store in both so list + form can see it
          phone_mobile: phoneToStore,
          phone: phoneToStore,

          contact_type: attendee.is_seller
            ? "seller"
            : attendee.is_buyer
            ? "buyer"
            : null,
          lead_source: attendee.lead_source || null,
          notes: attendee.notes || null,

          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError || !newContact) {
        console.error(
          "convert-to-contact: failed to create contact",
          insertError
        );
        return NextResponse.json(
          {
            error: "Failed to create contact",
            details: insertError,
          },
          { status: 500 }
        );
      }

      finalContactId = (newContact as { id: number }).id;

      // Link attendee → new contact
      const { error: linkError } = await supabase
        .from("open_home_attendees")
        .update({ contact_id: finalContactId })
        .eq("id", attendee.id);

      if (linkError) {
        console.error(
          "convert-to-contact: failed to link attendee to new contact",
          linkError
        );
        return NextResponse.json(
          {
            error: "Contact created but failed to link attendee",
            supabaseError: linkError,
          },
          { status: 500 }
        );
      }
    }

    // ───────────────── DONE ─────────────────
    return NextResponse.json({
      contactId: finalContactId,
      success: true,
    });
  } catch (err) {
    console.error(
      "Unexpected error in POST /open-homes/[eventId]/attendees/[attendeeId]/convert-to-contact",
      err
    );
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
