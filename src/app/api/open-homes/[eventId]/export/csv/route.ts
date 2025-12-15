// app/api/open-homes/[eventId]/export_csv/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type EventRow = {
  id: string;
  user_id: string;
  property_id: number;
  title: string | null;
  start_at: string;
};

type PropertyRow = {
  street_address: string;
  suburb: string;
  state: string;
  postcode: string;
};

type AttendeeRow = {
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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // 1) Load the event (scoped)
  const { data: event, error: eventError } = await supabase
    .from("open_home_events")
    .select("id, user_id, property_id, title, start_at")
    .eq("id", eventId)
    .eq("user_id", user.id)
    .maybeSingle<EventRow>();

  if (eventError) {
    console.error("Error loading open_home_event for CSV", eventError);
    return NextResponse.json(
      { error: "Failed to load open home" },
      { status: 500 }
    );
  }

  if (!event) {
    return NextResponse.json({ error: "Open home not found" }, { status: 404 });
  }

  // 2) Load the property label (scoped)
  const { data: property } = await supabase
    .from("properties")
    .select("street_address, suburb, state, postcode")
    .eq("id", event.property_id)
    .eq("user_id", user.id)
    .maybeSingle<PropertyRow>();

  const propertyLabel = property
    ? `${property.street_address}, ${property.suburb} ${property.state} ${property.postcode}`
    : `Property #${event.property_id}`;

  // 3) Load attendees (scoped)
  const { data: attendees, error: attendeesError } = await supabase
    .from("open_home_attendees")
    .select(
      "created_at, first_name, last_name, phone, email, lead_source, lead_source_other, is_buyer, is_seller, research_visit, mailing_list_opt_in, notes"
    )
    .eq("event_id", event.id)
    .eq("user_id", user.id)
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

  const toCsvField = (value: string | boolean | null | undefined): string => {
    const v =
      value === undefined || value === null
        ? ""
        : typeof value === "boolean"
        ? value
          ? "Yes"
          : "No"
        : String(value);
    return `"${v.replace(/"/g, '""')}"`;
  };

  const headerLines = [
    `Property: ${propertyLabel}`,
    `Open home: ${event.title || "Open home"}`,
    `Event ID: ${event.id}`,
    "",
  ];

  const headers = [
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
    const date = created.toLocaleDateString("en-AU");
    const time = created.toLocaleTimeString("en-AU");

    const role =
      a.is_buyer && a.is_seller
        ? "Buyer & Seller"
        : a.is_buyer
        ? "Buyer"
        : a.is_seller
        ? "Seller"
        : "Other";

    const lead = a.lead_source || "";
    const leadOther =
      a.lead_source === "Other" ? a.lead_source_other || "" : "";

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

  const csv = `${headerLines.join("\n")}\n${headers.join(",")}\n${dataRows.join(
    "\n"
  )}\n`;

  const filenameSafeTitle =
    (event.title || "open-home").toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
    "open-home";

  const filename = `${filenameSafeTitle}-${event.id}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
