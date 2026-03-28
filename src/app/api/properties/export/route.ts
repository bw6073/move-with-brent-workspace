// src/app/api/properties/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/requireUser";

function escapeCsv(value: string | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const { user, supabase, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const propertyType = searchParams.get("property_type") ?? "";

  let query = supabase
    .from("properties")
    .select(
      "id, street_address, suburb, state, postcode, property_type, bedrooms, bathrooms, car_spaces, land_size, land_size_unit, market_status, created_at"
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (status) query = query.eq("market_status", status);
  if (propertyType) query = query.eq("property_type", propertyType);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];

  const headers = [
    "ID",
    "Street address",
    "Suburb",
    "State",
    "Postcode",
    "Property type",
    "Bedrooms",
    "Bathrooms",
    "Car spaces",
    "Land size",
    "Land unit",
    "Status",
    "Created at",
  ];

  const csvRows = rows.map((p: any) => [
    escapeCsv(String(p.id)),
    escapeCsv(p.street_address),
    escapeCsv(p.suburb),
    escapeCsv(p.state),
    escapeCsv(p.postcode),
    escapeCsv(p.property_type),
    escapeCsv(p.bedrooms != null ? String(p.bedrooms) : ""),
    escapeCsv(p.bathrooms != null ? String(p.bathrooms) : ""),
    escapeCsv(p.car_spaces != null ? String(p.car_spaces) : ""),
    escapeCsv(p.land_size != null ? String(p.land_size) : ""),
    escapeCsv(p.land_size_unit),
    escapeCsv(p.market_status),
    escapeCsv(p.created_at ? new Date(p.created_at).toLocaleDateString("en-AU") : ""),
  ].join(","));

  const csv = [headers.join(","), ...csvRows].join("\n");

  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="properties-${today}.csv"`,
    },
  });
}
