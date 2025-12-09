// src/app/api/contacts/[id]/open-home-attendances/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    // Handle Next 16 Promise params
    const params =
      "then" in context.params ? await context.params : context.params;

    const contactId = Number(params.id);
    if (!params.id || Number.isNaN(contactId)) {
      return NextResponse.json(
        { error: "Invalid contact ID", rawId: params.id ?? null },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Auth – needed so RLS can apply
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "GET /contacts/[id]/open-home-attendances – unauthorised",
        userError
      );
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("open_home_attendees")
      .select(
        `
        id,
        event_id,
        created_at,
        notes,
        is_buyer,
        is_seller,
        lead_source,
        lead_source_other,
        open_home_events!inner(
          id,
          title,
          start_at,
          properties (
            id,
            street_address,
            suburb,
            state,
            postcode
          )
        )
      `
      )
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "GET /contacts/[id]/open-home-attendances – Supabase error",
        JSON.stringify(error, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to load open home attendances", supabaseError: error },
        { status: 500 }
      );
    }

    const items =
      (data ?? []).map((row: any) => {
        const event = row.open_home_events;
        const property = event?.properties;

        const propertyLabel = property
          ? `${property.street_address}, ${property.suburb} ${property.state} ${property.postcode}`
          : "Unknown property";

        const roleLabel =
          row.is_buyer && row.is_seller
            ? "Buyer & Seller"
            : row.is_buyer
            ? "Buyer"
            : row.is_seller
            ? "Seller"
            : "—";

        const attendedAt = event?.start_at ?? row.created_at ?? null;

        return {
          attendeeId: row.id as string,
          eventId: event?.id ?? "",
          eventTitle: event?.title ?? "Open home",
          propertyLabel,
          propertyId: property?.id ?? null,
          attendedAt,
          roleLabel,
          leadSource: row.lead_source ?? row.lead_source_other ?? null,
          notes: row.notes ?? null,
        };
      }) ?? [];

    return NextResponse.json({ items });
  } catch (err) {
    console.error(
      "GET /contacts/[id]/open-home-attendances – unexpected error",
      err
    );
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
