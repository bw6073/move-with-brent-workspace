// src/app/api/contacts/export/route.ts
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
  const stage = searchParams.get("stage") ?? "";
  const rating = searchParams.get("rating") ?? "";
  const isBuyer = searchParams.get("is_buyer") === "true";
  const isSeller = searchParams.get("is_seller") === "true";

  let query = supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, full_name, email, phone_mobile, mobile, phone, stage, rating, is_buyer, is_seller, created_at"
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (stage) query = query.eq("stage", stage);
  if (rating) query = query.eq("rating", rating);
  if (isBuyer) query = query.eq("is_buyer", true);
  if (isSeller) query = query.eq("is_seller", true);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];

  const headers = [
    "ID",
    "First name",
    "Last name",
    "Full name",
    "Email",
    "Phone",
    "Stage",
    "Rating",
    "Is buyer",
    "Is seller",
    "Created at",
  ];

  const csvRows = rows.map((c: any) => {
    const firstName = c.first_name ?? "";
    const lastName = c.last_name ?? "";
    const fullName =
      c.full_name || [firstName, lastName].filter(Boolean).join(" ");
    const phone = c.phone_mobile || c.mobile || c.phone || "";

    return [
      escapeCsv(String(c.id)),
      escapeCsv(firstName),
      escapeCsv(lastName),
      escapeCsv(fullName),
      escapeCsv(c.email),
      escapeCsv(phone),
      escapeCsv(c.stage),
      escapeCsv(c.rating),
      escapeCsv(c.is_buyer ? "Yes" : "No"),
      escapeCsv(c.is_seller ? "Yes" : "No"),
      escapeCsv(c.created_at ? new Date(c.created_at).toLocaleDateString("en-AU") : ""),
    ].join(",");
  });

  const csv = [headers.join(","), ...csvRows].join("\n");

  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contacts-${today}.csv"`,
    },
  });
}
