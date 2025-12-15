// app/api/open-homes/[eventId]/export_csv/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await context.params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("open_home_events")
    .select("id, property_id, title, start_at")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ error: "Open home not found" }, { status: 404 });
  }

  const { data: property } = await supabase
    .from("properties")
    .select("street_address, suburb, state, postcode")
    .eq("id", event.property_id)
    .maybeSingle();

  const { data: attendees } = await supabase
    .from("open_home_attendees")
    .select(
      "created_at, first_name, last_name, phone, email, lead_source, lead_source_other, is_buyer, is_seller, research_visit, mailing_list_opt_in, notes"
    )
    .eq("event_id", event.id)
    .order("created_at");

  const rows = attendees ?? [];

  const header =
    "Date,Time,First Name,Last Name,Phone,Email,Role,Lead Source,Research Visit,Mailing List,Notes\n";

  const body = rows
    .map((a) => {
      const d = new Date(a.created_at);
      const role =
        a.is_buyer && a.is_seller
          ? "Buyer & Seller"
          : a.is_buyer
          ? "Buyer"
          : a.is_seller
          ? "Seller"
          : "Other";

      return [
        d.toLocaleDateString(),
        d.toLocaleTimeString(),
        a.first_name,
        a.last_name,
        a.phone ?? "",
        a.email ?? "",
        role,
        a.lead_source ?? "",
        a.research_visit ? "Yes" : "No",
        a.mailing_list_opt_in ? "Yes" : "No",
        a.notes ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    })
    .join("\n");

  return new NextResponse(header + body, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="open-home-${event.id}.csv"`,
    },
  });
}
