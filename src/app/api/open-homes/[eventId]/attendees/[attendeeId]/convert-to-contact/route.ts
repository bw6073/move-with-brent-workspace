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
  user_id: string;
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

async function ensureOwnedEvent(
  supabase: any,
  eventId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data, error } = await supabase
    .from("open_home_events")
    .select("id")
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("convert-to-contact: error checking event ownership", error);
    return { ok: false, status: 500, error: "Failed to verify open home" };
  }

  if (!data) {
    return { ok: false, status: 404, error: "Open home not found" };
  }

  return { ok: true };
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
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // ✅ Ensure the event is owned by this user (defence in depth)
    const owned = await ensureOwnedEvent(supabase, eventId, user.id);
    if (!owned.ok) {
      return NextResponse.json(
        { error: owned.error },
        { status: owned.status }
      );
    }

    // ───────────────── 1) LOAD ATTENDEE (scoped) ─────────────────
    const { data: attendee, error: attendeeError } = await supabase
      .from("open_home_attendees")
      .select(
        `
        id,
        user_id,
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
      .eq("user_id", user.id)
      .maybeSingle<AttendeeRow>();

    if (attendeeError) {
      console.error(
        "convert-to-contact: failed to load attendee",
        attendeeError
      );
      return NextResponse.json(
        { error: "Failed to load attendee" },
        { status: 500 }
      );
    }

    if (!attendee) {
      return NextResponse.json(
        { error: "Attendee not found" },
        { status: 404 }
      );
    }

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

    // ───────────────── 2) FIND EXISTING CONTACT (same user) ─────────────────
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

        if (match) existingContactId = match.id;
      }
    }

    // ───────────────── 3) CREATE OR LINK ─────────────────
    let finalContactId: number;

    if (existingContactId) {
      const { error: linkError } = await supabase
        .from("open_home_attendees")
        .update({ contact_id: existingContactId })
        .eq("id", attendee.id)
        .eq("event_id", eventId)
        .eq("user_id", user.id);

      if (linkError) {
        console.error(
          "convert-to-contact: failed to link attendee to existing contact",
          linkError
        );
        return NextResponse.json(
          { error: "Failed to link attendee to existing contact" },
          { status: 500 }
        );
      }

      finalContactId = existingContactId;
    } else {
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
          name: displayName,
          first_name: attendee.first_name || null,
          last_name: attendee.last_name || null,
          email: attendee.email || null,
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
          { error: "Failed to create contact" },
          { status: 500 }
        );
      }

      finalContactId = (newContact as { id: number }).id;

      const { error: linkError } = await supabase
        .from("open_home_attendees")
        .update({ contact_id: finalContactId })
        .eq("id", attendee.id)
        .eq("event_id", eventId)
        .eq("user_id", user.id);

      if (linkError) {
        console.error(
          "convert-to-contact: failed to link attendee to new contact",
          linkError
        );
        return NextResponse.json(
          { error: "Contact created but failed to link attendee" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ contactId: finalContactId, success: true });
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
