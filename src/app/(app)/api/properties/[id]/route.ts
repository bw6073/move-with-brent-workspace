// src/app/api/properties/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, props: RouteProps) {
  const { id } = await props.params; // 👈 unwrap params Promise
  const numericId = Number(id);

  if (Number.isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const toNumberOrNull = (v: any) =>
    v === "" || v === undefined || v === null ? null : Number(v);

  const updatePayload = {
    street_address: body.streetAddress?.trim() || null,
    suburb: body.suburb?.trim() || null,
    state: body.state?.trim() || null,
    postcode: body.postcode?.trim() || null,
    property_type: body.propertyType?.trim() || null,
    bedrooms: toNumberOrNull(body.bedrooms),
    bathrooms: toNumberOrNull(body.bathrooms),
    car_spaces: toNumberOrNull(body.carSpaces),
    land_size: toNumberOrNull(body.landSize),
    land_size_unit: body.landSizeUnit?.trim() || null,
    zoning: body.zoning?.trim() || null,
    market_status: body.marketStatus?.trim() || "appraisal",
    headline: body.headline?.trim() || null,
    description: body.description?.trim() || null,
    notes: body.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from("properties")
    .update(updatePayload)
    .eq("id", numericId)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
        hint: error.hint,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ property: data });
}
