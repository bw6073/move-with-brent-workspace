import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type OpenHomeEventRow = {
  id: string;
  property_id: number;
  title: string | null;
  start_at: string;
  end_at: string | null;
};

type PropertyRow = {
  street_address: string;
  suburb: string;
  state: string;
  postcode: string;
};

type AttendeeRow = {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  lead_source: string | null;
  lead_source_other: string | null;
  is_buyer: boolean;
  is_seller: boolean;
  research_visit: boolean;
  mailing_list_opt_in: boolean;
  notes: string | null;
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await context.params;
  const supabase = await createClient();

  // 1) Load the event
  const { data: event, error: eventError } = await supabase
    .from("open_home_events")
    .select("id, property_id, title, start_at, end_at")
    .eq("id", eventId)
    .single<OpenHomeEventRow>();

  if (eventError || !event) {
    console.error("Error loading open_home_event for CSV", eventError);
    return NextResponse.json({ error: "Open home not found" }, { status: 404 });
  }

  // 2) Load the property (for label)
  const { data: property } = await supabase
    .from("properties")
    .select("street_address, suburb, state, postcode")
    .eq("id", event.property_id)
    .single<PropertyRow>();

  const propertyLabel = property
    ? `${property.street_address}, ${property.suburb} ${property.state} ${property.postcode}`
    : `Property #${event.property_id}`;

  // 3) Load attendees
  const { data: attendees, error: attendeesError } = await supabase
    .from("open_home_attendees")
    .select(
      "id, created_at, first_name, last_name, phone, email, lead_source, lead_source_other, is_buyer, is_seller, research_visit, mailing_list_opt_in, notes"
    )
    .eq("event_id", event.id)
    .order("created_at", { ascending: true })
    .returns<AttendeeRow[]>();

  if (attendeesError) {
    console.error("Error loading attendees for CSV", attendeesError);
    return NextResponse.json(
      { error: "Failed to load attendees" },
      { status: 500 }
    );
  }

  const rows = attendees ?? [];

  if (rows.length === 0) {
    // Return an empty CSV with just headers
    const emptyCsv =
      "Date,Time,First Name,Last Name,Phone,Email,Role,Lead Source,Lead Source Other,Research Visit,Mailing List,Notes\n";
    return new NextResponse(emptyCsv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="open-home-${event.id}-attendees.csv"`,
      },
    });
  }

  const toCsvField = (value: string | boolean | null | undefined): string => {
    const v =
      value === undefined || value === null
        ? ""
        : typeof value === "boolean"
        ? value
          ? "Yes"
          : "No"
        : String(value);

    // escape quotes
    return `"${v.replace(/"/g, '""')}"`;
  };

  const headerLines = [
    `Property: ${propertyLabel}`,
    `Open home: ${event.title || "Open Home"}`,
    `Event ID: ${event.id}`,
    "",
  ];

  const dataHeaders = [
    "Date",
    "Time",
    "First Name",
    "Last Name",
    "Phone",
    "Email",
    "Role",
    "Lead Source",
    "Lead Source Other",
    "Research Visit",
    "Mailing List",
    "Notes",
  ];

  const dataRows = rows.map((a) => {
    const created = new Date(a.created_at);
    const date = created.toLocaleDateString();
    const time = created.toLocaleTimeString();

    const role =
      a.is_buyer && a.is_seller
        ? "Buyer & Seller"
        : a.is_buyer
        ? "Buyer"
        : a.is_seller
        ? "Seller"
        : "Other";

    const lead =
      a.lead_source === "Other" && a.lead_source_other
        ? "Other"
        : a.lead_source || "";

    const leadOther =
      a.lead_source === "Other" && a.lead_source_other
        ? a.lead_source_other
        : "";

    return [
      toCsvField(date),
      toCsvField(time),
      toCsvField(a.first_name),
      toCsvField(a.last_name),
      toCsvField(a.phone),
      toCsvField(a.email),
      toCsvField(role),
      toCsvField(lead),
      toCsvField(leadOther),
      toCsvField(a.research_visit),
      toCsvField(a.mailing_list_opt_in),
      toCsvField(a.notes),
    ].join(",");
  });

  const csv =
    headerLines.join("\n") +
    "\n" +
    dataHeaders.join(",") +
    "\n" +
    dataRows.join("\n");

  const filenameSafeTitle =
    (event.title || "open-home").toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
    "open-home";

  const filename = `${filenameSafeTitle}-${event.id}-attendees.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
