// src/app/api/contacts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  // Next 16: params is a Promise
  params: Promise<{ id: string }>;
};

//
// PATCH – update a contact
//
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const contactId = Number(id);

    if (!id || Number.isNaN(contactId)) {
      return NextResponse.json(
        { error: "Invalid contact ID", rawId: id ?? null },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Auth user (so RLS passes)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("No authenticated user in PATCH /contacts/[id]", userError);
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Map incoming fields → DB columns
    const update: Record<string, any> = {
      name: body.name ?? null,
      first_name: body.first_name ?? null,
      last_name: body.last_name ?? null,

      email: body.email ?? null,

      phone_mobile: body.phone_mobile ?? null,
      phone_home: body.phone_home ?? null,
      phone_work: body.phone_work ?? null,
      phone: body.phone ?? null,

      street_address: body.street_address ?? null,
      suburb: body.suburb ?? null,
      state: body.state ?? null,
      postcode: body.postcode ?? null,
      postal_address: body.postal_address ?? null,

      contact_type: body.contact_type ?? null,
      lead_source: body.lead_source ?? null,
      notes: body.notes ?? null,

      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    // Remove undefineds so we don’t accidentally send them
    Object.keys(update).forEach((k) => {
      if (update[k] === undefined) delete update[k];
    });

    const { data, error } = await supabase
      .from("contacts")
      .update(update)
      .eq("id", contactId)
      .eq("user_id", user.id)
      .select(
        `
          id,
          user_id,
          name,
          first_name,
          last_name,
          email,
          phone_mobile,
          phone_home,
          phone_work,
          phone,
          street_address,
          suburb,
          state,
          postcode,
          postal_address,
          contact_type,
          lead_source,
          notes,
          created_at,
          updated_at
        `
      )
      .single();

    if (error || !data) {
      console.error(
        "Failed to update contact in PATCH /contacts/[id]",
        JSON.stringify(error, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to update contact", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ contact: data });
  } catch (err) {
    console.error("Unexpected error in PATCH /contacts/[id]", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

//
// DELETE – delete a contact (and unlink open home attendees first)
//
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const contactId = Number(id);

    if (!id || Number.isNaN(contactId)) {
      return NextResponse.json(
        { error: "Invalid contact ID", rawId: id ?? null },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "No authenticated user in DELETE /contacts/[id]",
        userError
      );
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // 1) Unlink any open_home_attendees that reference this contact
    const { error: attendeesError } = await supabase
      .from("open_home_attendees")
      .update({ contact_id: null })
      .eq("contact_id", contactId);

    if (attendeesError) {
      console.error(
        "Failed to clear open_home_attendees.contact_id before delete",
        attendeesError
      );
      return NextResponse.json(
        {
          error: "Failed to unlink attendees from contact",
          supabaseError: attendeesError,
        },
        { status: 500 }
      );
    }

    // 2) Delete the contact itself
    const { error: deleteError } = await supabase
      .from("contacts")
      .delete()
      .eq("id", contactId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error(
        "Failed to delete contact in DELETE /contacts/[id]",
        JSON.stringify(deleteError, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to delete contact", supabaseError: deleteError },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in DELETE /contacts/[id]", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
