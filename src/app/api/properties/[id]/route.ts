// src/app/api/properties/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteProps = {
  params: Promise<{ id: string }>;
};

async function requireUser(supabase: any) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Not signed in" }, { status: 401 }),
    };
  }
  return { user, response: null };
}

const toTextOrNull = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
};

const toNumberOrNull = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function parseId(id: string) {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

export async function GET(_req: NextRequest, props: RouteProps) {
  const { id } = await props.params;
  const numericId = parseId(id);

  if (!numericId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (response) return response;

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", numericId)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (error) {
    console.error("[GET /api/properties/[id]] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  return NextResponse.json({ property: data });
}

export async function PATCH(req: NextRequest, props: RouteProps) {
  const { id } = await props.params;
  const numericId = parseId(id);

  if (!numericId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (response) return response;

  const body = await req.json().catch(() => ({} as any));

  const updatePayload = {
    street_address:
      body.streetAddress !== undefined
        ? toTextOrNull(body.streetAddress)
        : undefined,
    suburb: body.suburb !== undefined ? toTextOrNull(body.suburb) : undefined,
    state:
      body.state !== undefined ? toTextOrNull(body.state) ?? "WA" : undefined,
    postcode:
      body.postcode !== undefined ? toTextOrNull(body.postcode) : undefined,

    lot_number:
      body.lotNumber !== undefined ? toTextOrNull(body.lotNumber) : undefined,

    property_type:
      body.propertyType !== undefined
        ? toTextOrNull(body.propertyType)
        : undefined,
    bedrooms:
      body.bedrooms !== undefined ? toNumberOrNull(body.bedrooms) : undefined,
    bathrooms:
      body.bathrooms !== undefined ? toNumberOrNull(body.bathrooms) : undefined,
    car_spaces:
      body.carSpaces !== undefined ? toNumberOrNull(body.carSpaces) : undefined,
    built_year:
      body.builtYear !== undefined ? toNumberOrNull(body.builtYear) : undefined,

    land_size:
      body.landSize !== undefined ? toNumberOrNull(body.landSize) : undefined,
    land_size_unit:
      body.landSizeUnit !== undefined
        ? toTextOrNull(body.landSizeUnit) ?? "sqm"
        : undefined,
    zoning: body.zoning !== undefined ? toTextOrNull(body.zoning) : undefined,

    market_status:
      body.marketStatus !== undefined
        ? toTextOrNull(body.marketStatus) ?? "appraisal"
        : undefined,

    price_from:
      body.priceFrom !== undefined ? toNumberOrNull(body.priceFrom) : undefined,
    price_to:
      body.priceTo !== undefined ? toNumberOrNull(body.priceTo) : undefined,
    list_price:
      body.listPrice !== undefined ? toNumberOrNull(body.listPrice) : undefined,
    sold_price:
      body.soldPrice !== undefined ? toNumberOrNull(body.soldPrice) : undefined,

    campaign_start:
      body.campaignStart !== undefined
        ? toTextOrNull(body.campaignStart)
        : undefined,
    campaign_end:
      body.campaignEnd !== undefined
        ? toTextOrNull(body.campaignEnd)
        : undefined,
    settlement_date:
      body.settlementDate !== undefined
        ? toTextOrNull(body.settlementDate)
        : undefined,

    headline:
      body.headline !== undefined ? toTextOrNull(body.headline) : undefined,
    description:
      body.description !== undefined
        ? toTextOrNull(body.description)
        : undefined,
    notes: body.notes !== undefined ? toTextOrNull(body.notes) : undefined,
  };

  // Remove undefined keys so PATCH only updates what was provided
  const updates = Object.fromEntries(
    Object.entries(updatePayload).filter(([, v]) => v !== undefined)
  );

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("properties")
    .update(updates)
    .eq("id", numericId)
    .eq("user_id", user!.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[PATCH /api/properties/[id]] error:", error);
    return NextResponse.json(
      { error: error.message, details: error.details, hint: error.hint },
      { status: 400 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  return NextResponse.json({ property: data });
}

export async function DELETE(_req: NextRequest, props: RouteProps) {
  const { id } = await props.params;
  const numericId = parseId(id);

  if (!numericId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (response) return response;

  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", numericId)
    .eq("user_id", user!.id);

  if (error) {
    console.error("[DELETE /api/properties/[id]] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
