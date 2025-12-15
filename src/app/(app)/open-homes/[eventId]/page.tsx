// src/app/(app)/open-homes/[eventId]/page.tsx
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
  user_id: string;
};

type Property = {
  id: number;
  street_address: string;
  suburb: string;
  state: string;
  postcode: string;
  user_id: string;
};

type RouteProps = {
  params: Promise<{ eventId: string }>;
};

const formatDateTime = (iso: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${format(d, "EEE d MMM yyyy")} · ${format(d, "h:mm a")}`;
};

export default async function OpenHomeAdminPage(props: RouteProps) {
  const { eventId } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 px-6 py-6">
        <h1 className="mb-2 text-2xl font-semibold">Open home</h1>
        <p className="text-red-600">You must be logged in to view this page.</p>
        <Link
          href="/open-homes"
          className="mt-2 inline-flex text-sm text-blue-600 hover:underline"
        >
          ← Back to open homes
        </Link>
      </div>
    );
  }

  // 1) Load the event (scoped to the current user)
  const { data: event, error: eventError } = await supabase
    .from("open_home_events")
    .select("id, user_id, property_id, title, start_at, end_at, notes")
    .eq("id", eventId)
    .eq("user_id", user.id)
    .maybeSingle<OpenHomeEvent>();

  if (!event) {
    if (eventError) {
      console.error("Error loading open_home_event", eventError);
    }

    return (
      <div className="mx-auto max-w-5xl space-y-3 px-6 py-6">
        <h1 className="mb-2 text-2xl font-semibold">Open home</h1>
        <p className="text-red-600">
          This open home could not be found. It may have been deleted, or you
          don’t have access to it.
        </p>
        <Link
          href="/open-homes"
          className="mt-2 inline-flex text-sm text-blue-600 hover:underline"
        >
          ← Back to open homes
        </Link>
      </div>
    );
  }

  // 2) Load the property for the label (also scoped)
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, user_id, street_address, suburb, state, postcode")
    .eq("id", event.property_id)
    .eq("user_id", user.id)
    .maybeSingle<Property>();

  if (propertyError) {
    console.error("Error loading property for open home", propertyError);
  }

  const propertyLabel = property
    ? `${property.street_address}, ${property.suburb} ${property.state} ${property.postcode}`
    : `Property #${event.property_id}`;

  // 3) Load attendees (scoped)
  const { data: attendeesData = [], error: attendeesError } = await supabase
    .from("open_home_attendees")
    .select(
      `
      id,
      created_at,
      first_name,
      last_name,
      phone,
      email,
      lead_source,
      lead_source_other,
      is_buyer,
      is_seller,
      research_visit,
      mailing_list_opt_in,
      notes,
      contact_id
    `
    )
    .eq("event_id", event.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .returns<Attendee[]>();

  if (attendeesError) {
    console.error("Error loading attendees for open home", attendeesError);
  }

  const attendees: Attendee[] = attendeesData ?? [];

  // Kiosk URL with property label baked in
  const kioskUrl = `/open-homes/${event.id}/kiosk?propertyId=${
    event.property_id
  }&propertyAddress=${encodeURIComponent(propertyLabel)}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
      {/* HEADER */}
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Open home
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {event.title || "Open home"}
          </h1>
          <p className="text-sm text-slate-600">{propertyLabel}</p>
          <p className="mt-1 text-sm text-slate-500">
            {formatDateTime(event.start_at)}
            {event.end_at ? ` – ${formatDateTime(event.end_at)}` : ""}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/open-homes/${event.id}/edit`}
              className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Edit
            </Link>
            <Link
              href={kioskUrl}
              target="_blank"
              className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Launch kiosk
            </Link>
            <DeleteEventButton eventId={event.id} />
          </div>
          <p className="max-w-xs text-right text-[11px] text-slate-500">
            Open the kiosk link on your iPad or iPhone at the home open for
            visitor check-ins.
          </p>
        </div>
      </header>

      {/* EVENT NOTES */}
      {event.notes && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Event notes
          </div>
          <p>{event.notes}</p>
        </section>
      )}

      {/* ATTENDEES */}
      <section className="space-y-3">
        <OpenHomeAttendeesClient
          eventId={event.id}
          initialAttendees={attendees}
        />
      </section>
    </div>
  );
}
