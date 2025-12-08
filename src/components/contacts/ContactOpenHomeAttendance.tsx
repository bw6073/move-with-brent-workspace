// src/components/contacts/ContactOpenHomeAttendance.tsx
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";

type Props = {
  contactId: number;
};

type AttendeeRow = {
  id: string;
  event_id: string;
  created_at: string;
  is_buyer: boolean | null;
  is_seller: boolean | null;
  research_visit: boolean | null;
  mailing_list_opt_in: boolean | null;
  notes: string | null;
};

type EventRow = {
  id: string;
  title: string | null;
  start_at: string;
  end_at: string | null;
  property_id: number | null;
};

type PropertyRow = {
  id: number;
  street_address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
};

const roleLabel = (a: AttendeeRow) => {
  const isBuyer = !!a.is_buyer;
  const isSeller = !!a.is_seller;

  if (isBuyer && isSeller) return "Buyer & Seller";
  if (isBuyer) return "Buyer";
  if (isSeller) return "Seller";
  return "Other";
};

const formatDateTime = (iso: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return format(d, "EEE d MMM yyyy · h:mm a");
};

export async function ContactOpenHomeAttendance({ contactId }: Props) {
  const supabase = await createClient();

  // 1) Load attendee rows for this contact
  const { data: attendeeData, error: attendeeError } = await supabase
    .from("open_home_attendees")
    .select(
      `
        id,
        event_id,
        created_at,
        is_buyer,
        is_seller,
        research_visit,
        mailing_list_opt_in,
        notes
      `
    )
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (attendeeError) {
    console.error(
      "[ContactOpenHomeAttendance] error loading attendees",
      attendeeError
    );
  }

  const attendees: AttendeeRow[] = (attendeeData ?? []) as AttendeeRow[];

  if (attendees.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">
          Open homes attended
        </h2>
        <p className="text-xs text-slate-500">
          No open home attendance has been recorded for this contact yet.
        </p>
      </section>
    );
  }

  // 2) Load events for those attendee event_ids
  const eventIds = Array.from(
    new Set(attendees.map((a) => a.event_id).filter(Boolean))
  );

  let eventsMap = new Map<string, EventRow>();
  let propertiesMap = new Map<number, PropertyRow>();

  if (eventIds.length > 0) {
    const { data: eventsData, error: eventsError } = await supabase
      .from("open_home_events")
      .select("id, title, start_at, end_at, property_id")
      .in("id", eventIds);

    if (eventsError) {
      console.error(
        "[ContactOpenHomeAttendance] error loading events",
        eventsError
      );
    }

    const events: EventRow[] = (eventsData ?? []) as EventRow[];
    eventsMap = new Map(events.map((e) => [e.id, e]));

    // 3) Load properties for those events
    const propertyIds = Array.from(
      new Set(
        events
          .map((e) => e.property_id)
          .filter((id): id is number => typeof id === "number")
      )
    );

    if (propertyIds.length > 0) {
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("id, street_address, suburb, state, postcode")
        .in("id", propertyIds);

      if (propertiesError) {
        console.error(
          "[ContactOpenHomeAttendance] error loading properties",
          propertiesError
        );
      }

      const properties: PropertyRow[] = (propertiesData ?? []) as PropertyRow[];
      propertiesMap = new Map(properties.map((p) => [p.id, p]));
    }
  }

  const rows = attendees.map((a) => {
    const event = eventsMap.get(a.event_id) || null;
    const property =
      event && event.property_id
        ? propertiesMap.get(event.property_id) || null
        : null;

    const propertyLabel = property
      ? [
          property.street_address,
          property.suburb,
          property.state || "WA",
          property.postcode,
        ]
          .filter(Boolean)
          .join(" ")
      : event?.property_id
      ? `Property #${event.property_id}`
      : "Unknown property";

    return {
      attendee: a,
      event,
      propertyLabel,
    };
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          Open homes attended
        </h2>
        <span className="text-xs text-slate-500">
          {rows.length} visit{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      <ul className="space-y-3">
        {rows.map(({ attendee, event, propertyLabel }) => (
          <li
            key={attendee.id}
            className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-900">
                  {event ? (
                    <Link
                      href={`/open-homes/${event.id}`}
                      className="hover:underline"
                    >
                      {event.title || "Open home"}
                    </Link>
                  ) : (
                    "Open home"
                  )}
                </div>
                <div className="truncate text-xs text-slate-600">
                  {propertyLabel}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  {event
                    ? formatDateTime(event.start_at)
                    : formatDateTime(attendee.created_at)}{" "}
                  · {roleLabel(attendee)}
                </div>
              </div>
              <div className="shrink-0 text-right text-[11px] text-slate-500">
                <div>
                  Research visit:{" "}
                  <span className="font-medium">
                    {attendee.research_visit ? "Yes" : "No"}
                  </span>
                </div>
                <div>
                  Mailing list:{" "}
                  <span className="font-medium">
                    {attendee.mailing_list_opt_in ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>

            {attendee.notes && (
              <p className="mt-1 text-[11px] text-slate-600">
                <span className="font-medium">Notes: </span>
                {attendee.notes}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
