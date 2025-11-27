// src/app/api/properties/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as any;

    const toNumberOrNull = (value: unknown) => {
      if (value === null || value === undefined || value === "") return null;
      const n = Number(value);
      return Number.isNaN(n) ? null : n;
    };

    const insertPayload = {
      user_id: user.id,
      street_address: (body.streetAddress ?? "").trim() || null,
      suburb: (body.suburb ?? "").trim() || null,
      state: (body.state ?? "").trim() || "WA",
      postcode: (body.postcode ?? "").trim() || null,

      property_type: (body.propertyType ?? "").trim() || null,
      bedrooms: toNumberOrNull(body.bedrooms),
      bathrooms: toNumberOrNull(body.bathrooms),
      car_spaces: toNumberOrNull(body.carSpaces),

      land_size: toNumberOrNull(body.landSize),
      land_size_unit: (body.landSizeUnit ?? "").trim() || null,
      zoning: (body.zoning ?? "").trim() || null,

      market_status: (body.marketStatus ?? "").trim() || "appraisal",

      headline: (body.headline ?? "").trim() || null,
      description: (body.description ?? "").trim() || null,
      notes: (body.notes ?? "").trim() || null,
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

    return NextResponse.json({ property });
  } catch (err) {
    console.error("[POST /api/properties] unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
