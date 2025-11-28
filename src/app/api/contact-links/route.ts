// src/app/api/contact-links/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/contact-links?contactId=123
export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const url = new URL(req.url);
    const contactIdParam = url.searchParams.get("contactId");
    const contactId = contactIdParam ? Number(contactIdParam) : null;

    if (!contactId || Number.isNaN(contactId)) {
      return NextResponse.json(
        { error: "Invalid contactId", raw: contactIdParam },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("contact_links")
      .select(
        `
        id,
        contact_id,
        linked_contact_id,
        created_at,
        contact:contacts!contact_links_contact_id_fkey (
          id,
          name,
          first_name,
          last_name,
          email,
          phone_mobile,
          phone
        ),
        linked:contacts!contact_links_linked_contact_id_fkey (
          id,
          name,
          first_name,
          last_name,
          email,
          phone_mobile,
          phone
        )
      `
      )
      .eq("user_id", user.id)
      .eq("contact_id", contactId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/contact-links] supabase error", error);
      return NextResponse.json(
        { error: "Failed to load linked contacts", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ links: data ?? [] }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/contact-links] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

// POST /api/contact-links
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { contact_id, linked_contact_id } = body ?? {};

  const contactId = Number(contact_id);
  const linkedId = Number(linked_contact_id);

  if (
    !contactId ||
    !linkedId ||
    Number.isNaN(contactId) ||
    Number.isNaN(linkedId)
  ) {
    return NextResponse.json(
      { error: "contact_id and linked_contact_id are required numbers" },
      { status: 400 }
    );
  }

  if (contactId === linkedId) {
    return NextResponse.json(
      { error: "Cannot link a contact to themselves" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // Insert a one-way link (we'll show it from contact_id's perspective)
    const { data, error } = await supabase
      .from("contact_links")
      .insert({
        user_id: user.id,
        contact_id: contactId,
        linked_contact_id: linkedId,
      })
      .select(
        `
        id,
        contact_id,
        linked_contact_id,
        created_at,
        contact:contacts!contact_links_contact_id_fkey (
          id,
          name,
          first_name,
          last_name,
          email,
          phone_mobile,
          phone
        ),
        linked:contacts!contact_links_linked_contact_id_fkey (
          id,
          name,
          first_name,
          last_name,
          email,
          phone_mobile,
          phone
        )
      `
      )
      .maybeSingle();

    if (error) {
      console.error("[POST /api/contact-links] supabase error", error);
      return NextResponse.json(
        { error: "Failed to create link", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ link: data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/contact-links] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
