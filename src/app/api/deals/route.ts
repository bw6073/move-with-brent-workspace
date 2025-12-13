// src/app/api/deals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const toNumberOrNull = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const buildAddressTitle = (p: {
  street_address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
}) => {
  const street = (p.street_address ?? "").trim();
  const suburb = (p.suburb ?? "").trim();
  const state = (p.state ?? "WA").trim();
  const postcode = (p.postcode ?? "").toString().trim();

  const parts = [street, suburb, state, postcode].filter(Boolean);
  return parts.length ? parts.join(", ") : "";
};

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const propertyId =
      toNumberOrNull(searchParams.get("propertyId")) ??
      toNumberOrNull(searchParams.get("property_id"));

    const contactId =
      toNumberOrNull(searchParams.get("contactId")) ??
      toNumberOrNull(searchParams.get("contact_id"));

    const appraisalId =
      toNumberOrNull(searchParams.get("appraisalId")) ??
      toNumberOrNull(searchParams.get("appraisal_id"));

    let q = supabase
      .from("deals")
      .select(
        `
        id,
        user_id,
        title,
        stage,
        contact_id,
        property_id,
        appraisal_id,
        estimated_value_low,
        estimated_value_high,
        confidence,
        next_action_at,
        lost_reason,
        notes,
        created_at,
        updated_at,
        contacts:contact_id (
          id,
          first_name,
          last_name,
          phone_mobile,
          email
        ),
        properties:property_id (
          id,
          street_address,
          suburb,
          state,
          postcode
        ),
        appraisals:appraisal_id (
          id,
          status,
          created_at,
          updated_at,
          data
        )
      `
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (propertyId) q = q.eq("property_id", propertyId);
    if (contactId) q = q.eq("contact_id", contactId);
    if (appraisalId) q = q.eq("appraisal_id", appraisalId);

    const { data, error } = await q;

    if (error) {
      console.error("[GET /api/deals] supabase error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/deals] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const propertyId =
      toNumberOrNull(body.property_id) ??
      toNumberOrNull(body.propertyId) ??
      toNumberOrNull(body.prefillPropertyId);

    const contactId =
      toNumberOrNull(body.contact_id) ?? toNumberOrNull(body.contactId);

    const appraisalId =
      toNumberOrNull(body.appraisal_id) ?? toNumberOrNull(body.appraisalId);

    // If propertyId provided, load it + enforce ownership so we can title from address
    let propertyRow: {
      id: number;
      street_address: string | null;
      suburb: string | null;
      state: string | null;
      postcode: string | null;
    } | null = null;

    if (propertyId) {
      const { data: prop, error: propErr } = await supabase
        .from("properties")
        .select("id, street_address, suburb, state, postcode")
        .eq("id", propertyId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (propErr) {
        console.error("[POST /api/deals] property lookup error", propErr);
        return NextResponse.json({ error: propErr.message }, { status: 500 });
      }

      if (!prop) {
        return NextResponse.json(
          { error: "Property not found" },
          { status: 404 }
        );
      }

      propertyRow = prop as any;
    }

    // Title priority:
    // 1) provided title
    // 2) property full address (if we have it)
    // 3) Property #id (if property exists but address blank)
    // 4) New deal
    const providedTitle = clean(body.title);
    const propertyAddressTitle = propertyRow
      ? buildAddressTitle(propertyRow)
      : "";

    const title =
      providedTitle ||
      propertyAddressTitle ||
      (propertyRow ? `Property #${propertyRow.id}` : "") ||
      "New deal";

    const stage =
      (typeof body.stage === "string" ? body.stage : null) ?? "lead";

    const notes = clean(body.notes);

    const insertPayload = {
      user_id: user.id,
      title, // NOT NULL safe
      stage,
      property_id: propertyId,
      contact_id: contactId,
      appraisal_id: appraisalId,
      notes: notes || null,
    };

    const { data, error } = await supabase
      .from("deals")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error || !data) {
      console.error("[POST /api/deals] insert error:", error);
      return NextResponse.json(
        {
          error: error?.message ?? "Failed to create deal",
          details: error?.details ?? null,
          hint: error?.hint ?? null,
          code: error?.code ?? null,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ deal: data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/deals] unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
