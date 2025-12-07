// app/open-homes/[eventId]/page.tsx
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { format } from "date-fns";
import { OpenHomeAttendeesClient, Attendee } from "./OpenHomeAttendeesClient";
import { DeleteEventButton } from "./DeleteEventButton";

type OpenHomeEvent = {
  id: string;
  property_id: number;
  title: string | null;
  start_at: string;
  end_at: string | null;
  notes: string | null;
};

type Property = {
  id: number;
  street_address: string;
  suburb: string;
  state: string;
  postcode: string;
};

type RouteProps = {
  params: Promise<{ eventId: string }>;
};

export default async function OpenHomeAdminPage(props: RouteProps) {
  const { eventId } = await props.params;
  const supabase = await createClient();

  // 1) Load the event
  const { data: event, error: eventError } = await supabase
    .from("open_home_events")
    .select("id, property_id, title, start_at, end_at, notes")
    .eq("id", eventId)
    .single<OpenHomeEvent>();

  const isNotFound = (eventError as any)?.code === "PGRST116";

  if (eventError || !event) {
    // Only log unexpected errors, not "no rows" after delete
    if (!isNotFound) {
      console.error("Error loading open_home_event", eventError);
    }

    return (
      <div className="p-6 space-y-3">
        <h1 className="text-2xl font-semibold mb-2">Open Home</h1>
        <p className="text-red-600">
          {isNotFound
            ? "This open home could not be found. It may have been deleted."
            : "Could not load this open home."}
        </p>
        <Link
          href="/open-homes"
          className="inline-flex mt-2 text-sm text-blue-600 hover:underline"
        >
          ← Back to open homes
        </Link>
      </div>
    );
  }

  // 2) Load the property
  const { data: property } = await supabase
    .from("properties")
    .select("id, street_address, suburb, state, postcode")
    .eq("id", event.property_id)
    .single<Property>();

  const propertyLabel = property
    ? `${property.street_address}, ${property.suburb} ${property.state} ${property.postcode}`
    : `Property #${event.property_id}`;

  // 3) Load attendees
  const { data: attendeesData = [] } = await supabase
    .from("open_home_attendees")
    .select(
      "id, created_at, first_name, last_name, phone, email, lead_source, lead_source_other, is_buyer, is_seller, research_visit, mailing_list_opt_in, notes"
    )
    .eq("event_id", event.id)
    .order("created_at", { ascending: true })
    .returns<Attendee[]>();

  const attendees: Attendee[] = attendeesData ?? [];

  // Kiosk link for this event/property
  const kioskUrl = `/open-homes/${event.id}/kiosk?propertyId=${
    event.property_id
  }&propertyAddress=${encodeURIComponent(propertyLabel)}`;

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return `${format(d, "EEE d MMM yyyy")} · ${format(d, "h:mm a")}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">
            {event.title || "Open Home"}
          </h1>
          <p className="text-sm text-zinc-600">{propertyLabel}</p>
          <p className="text-sm text-zinc-600 mt-1">
            {formatDateTime(event.start_at)}
            {event.end_at ? ` – ${formatDateTime(event.end_at)}` : ""}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Link
              href={`/open-homes/${event.id}/edit`}
              className="inline-flex items-center rounded-full border border-zinc-300 text-sm font-medium px-4 py-2 hover:border-blue-500 hover:text-blue-600"
            >
              Edit
            </Link>
            <Link
              href={kioskUrl}
              target="_blank"
              className="inline-flex items-center rounded-full bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700"
            >
              Launch kiosk
            </Link>
            <DeleteEventButton eventId={event.id} />
          </div>
          <p className="text-xs text-zinc-500 max-w-xs text-right">
            Open the kiosk link on your iPad/iPhone at the home open for visitor
            check-ins.
          </p>
        </div>
      </div>

      {/* Event notes */}
      {event.notes && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          <strong className="font-medium">Event notes: </strong>
          {event.notes}
        </div>
      )}

      {/* Attendees (client component) */}
      <OpenHomeAttendeesClient
        eventId={event.id}
        initialAttendees={attendees}
      />
    </div>
  );
}
