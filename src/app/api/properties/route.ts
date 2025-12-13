// src/app/api/properties/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

// Optional: GET /api/properties?status=for_sale&suburb=Mundaring&q=gannon
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const suburb = searchParams.get("suburb");
  const q = searchParams.get("q");

  let query = supabase
    .from("properties")
    .select("*")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  if (status) query = query.eq("market_status", status);
  if (suburb) query = query.ilike("suburb", suburb);
  if (q) {
    // basic search across street/suburb/notes/headline
    query = query.or(
      `street_address.ilike.%${q}%,suburb.ilike.%${q}%,headline.ilike.%${q}%,notes.ilike.%${q}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("[GET /api/properties] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { user, response } = await requireUser(supabase);
    if (response) return response;

    const body = (await req.json().catch(() => ({}))) as any;

    const street_address = toTextOrNull(body.streetAddress);
    const suburb = toTextOrNull(body.suburb);

    if (!street_address || !suburb) {
      return NextResponse.json(
        { error: "streetAddress and suburb are required" },
        { status: 400 }
      );
    }

    const insertPayload = {
      user_id: user!.id,
      street_address,
      suburb,
      state: toTextOrNull(body.state) ?? "WA",
      postcode: toTextOrNull(body.postcode),

      lot_number: toTextOrNull(body.lotNumber),

      property_type: toTextOrNull(body.propertyType),
      bedrooms: toNumberOrNull(body.bedrooms),
      bathrooms: toNumberOrNull(body.bathrooms),
      car_spaces: toNumberOrNull(body.carSpaces),
      built_year: toNumberOrNull(body.builtYear),

      land_size: toNumberOrNull(body.landSize),
      land_size_unit: toTextOrNull(body.landSizeUnit) ?? "sqm",
      zoning: toTextOrNull(body.zoning),

      market_status: toTextOrNull(body.marketStatus) ?? "appraisal",

      price_from: toNumberOrNull(body.priceFrom),
      price_to: toNumberOrNull(body.priceTo),
      list_price: toNumberOrNull(body.listPrice),
      sold_price: toNumberOrNull(body.soldPrice),

      campaign_start: toTextOrNull(body.campaignStart), // date string OK
      campaign_end: toTextOrNull(body.campaignEnd),
      settlement_date: toTextOrNull(body.settlementDate),

      headline: toTextOrNull(body.headline),
      description: toTextOrNull(body.description),
      notes: toTextOrNull(body.notes),
    };

    const { data: property, error } = await supabase
      .from("properties")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error || !property) {
      console.error("[POST /api/properties] insert error:", error);
      return NextResponse.json(
        {
          error: error?.message ?? "Failed to create property",
          details: error?.details ?? null,
          hint: error?.hint ?? null,
          code: error?.code ?? null,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ property }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/properties] unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
