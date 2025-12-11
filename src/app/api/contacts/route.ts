// src/app/api/contacts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Small helper so the front-end has a consistent shape
function mapContact(row: any) {
  return {
    id: row.id,
    user_id: row.user_id ?? null,
    name: row.name ?? null,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    email: row.email ?? null,
    phone_mobile: row.phone_mobile ?? null,
    phone_home: row.phone_home ?? null,
    phone_work: row.phone_work ?? null,
    phone: row.phone ?? null,
    type: row.type ?? null,
    tags: row.tags ?? null,
    source: row.source ?? null,
    notes: row.notes ?? null,
    stage: row.stage ?? null,
    rating: row.rating ?? null,
    timeframe_to_move: row.timeframe_to_move ?? null,
    is_seller: row.is_seller ?? null,
    is_buyer: row.is_buyer ?? null,
    marketing_opt_in: row.marketing_opt_in ?? null,
    do_not_contact: row.do_not_contact ?? null,
    street_address: row.street_address ?? null,
    suburb: row.suburb ?? null,
    state: row.state ?? null,
    postcode: row.postcode ?? null,
    postal_address: row.postal_address ?? null,
    contact_type: row.contact_type ?? null,
    lead_source: row.lead_source ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

// ─────────────────────────────────────────────
// GET /api/contacts
// List contacts for the current user
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("No authenticated user in GET /api/contacts", userError);
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || null;

    let query = supabase
      .from("contacts")
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
        type,
        tags,
        source,
        notes,
        stage,
        rating,
        timeframe_to_move,
        is_seller,
        is_buyer,
        marketing_opt_in,
        do_not_contact,
        street_address,
        suburb,
        state,
        postcode,
        postal_address,
        contact_type,
        lead_source,
        created_at,
        updated_at
      `
      )
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (q) {
      // simple name search
      query = query.ilike("name", `%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "Failed to load contacts in GET /api/contacts",
        JSON.stringify(error, null, 2)
      );
      return NextResponse.json(
        {
          error: "supabase_error",
          message: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    const items = (data ?? []).map(mapContact);

    // Your AppraisalForm is tolerant of array OR { items },
    // but we'll keep it explicit:
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Unexpected error in GET /api/contacts", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// POST /api/contacts
// Create a new contact for the current user
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("No authenticated user in POST /api/contacts", userError);
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Compose a full name if not explicitly given
    const composedName =
      body.name ??
      ([body.first_name, body.last_name].filter(Boolean).join(" ") || null);

    const now = new Date().toISOString();

    // Map front-end fields → DB columns
    const insert: Record<string, any> = {
      user_id: user.id,
      name: composedName,
      first_name: body.first_name ?? null,
      last_name: body.last_name ?? null,

      email: body.email ?? null,
      phone_mobile: body.phone_mobile ?? body.phone ?? null,
      phone: body.phone ?? null,
      phone_home: body.phone_home ?? null,
      phone_work: body.phone_work ?? null,

      type: body.type ?? null,
      tags: body.tags ?? null,
      source: body.source ?? null,
      notes: body.notes ?? null,
      stage: body.stage ?? null,
      rating: body.rating ?? null,
      timeframe_to_move: body.timeframe_to_move ?? null,
      is_seller: body.is_seller ?? null,
      is_buyer: body.is_buyer ?? null,
      marketing_opt_in: body.marketing_opt_in ?? null,
      do_not_contact: body.do_not_contact ?? null,

      street_address: body.street_address ?? null,
      suburb: body.suburb ?? null,
      state: body.state ?? null,
      postcode: body.postcode ?? null,
      postal_address: body.postal_address ?? null,

      contact_type: body.contact_type ?? null,
      lead_source: body.lead_source ?? null,

      created_at: now,
      updated_at: now,
    };

    // Strip any undefined values to avoid unexpected column issues
    for (const key of Object.keys(insert)) {
      if (insert[key] === undefined) {
        delete insert[key];
      }
    }

    const { data, error } = await supabase
      .from("contacts")
      .insert(insert)
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
        type,
        tags,
        source,
        notes,
        stage,
        rating,
        timeframe_to_move,
        is_seller,
        is_buyer,
        marketing_opt_in,
        do_not_contact,
        street_address,
        suburb,
        state,
        postcode,
        postal_address,
        contact_type,
        lead_source,
        created_at,
        updated_at
      `
      )
      .single();

    if (error || !data) {
      console.error(
        "Failed to create contact in POST /api/contacts",
        JSON.stringify(error, null, 2)
      );
      return NextResponse.json(
        {
          error: "Failed to create contact",
          supabaseError: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ contact: mapContact(data) }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/contacts", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
