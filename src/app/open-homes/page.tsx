import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { format } from "date-fns";

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

type AttendeeRow = {
  event_id: string;
};

export default async function OpenHomesIndexPage() {
  const supabase = await createClient();

  // 1) Load all open home events, ordered by start time
  const { data: eventsData, error: eventsError } = await supabase
    .from("open_home_events")
    .select("id, property_id, title, start_at, end_at, notes")
    .order("start_at", { ascending: true })
    .returns<OpenHomeEvent[]>();

  if (eventsError) {
    console.error("Error loading open_home_events", eventsError);
  }

  const events: OpenHomeEvent[] = eventsData ?? [];

  if (events.length === 0) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Open homes</h1>
          <Link
            href="/open-homes/new"
            className="inline-flex items-center rounded-full bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700"
          >
            + Schedule open home
          </Link>
        </div>
        <p className="text-sm text-zinc-600">
          No open home events yet. Schedule your first one to start tracking
          attendees.
        </p>
      </div>
    );
  }

  // 2) Load relevant properties in one go
  const propertyIds = Array.from(
    new Set(events.map((e) => e.property_id).filter(Boolean))
  );

  const propertyMap = new Map<number, Property>();

  if (propertyIds.length > 0) {
    const { data: propertiesData, error: propertiesError } = await supabase
      .from("properties")
      .select("id, street_address, suburb, state, postcode")
      .in("id", propertyIds)
      .returns<Property[]>();

    if (propertiesError) {
      console.error("Error loading properties for open homes", propertiesError);
    }

    const properties: Property[] = propertiesData ?? [];

    for (const p of properties) {
      propertyMap.set(p.id, p);
    }
  }

  // 3) Load attendee rows for all these events and build a count map
  const eventIds = events.map((e) => e.id);
  const attendeeCountMap = new Map<string, number>();

  if (eventIds.length > 0) {
    const { data: attendeeRows, error: attendeesError } = await supabase
      .from("open_home_attendees")
      .select("event_id")
      .in("event_id", eventIds)
      .returns<AttendeeRow[]>();

    if (attendeesError) {
      console.error(
        "Error loading open_home_attendees for counts",
        attendeesError
      );
    }

    (attendeeRows ?? []).forEach((row) => {
      const current = attendeeCountMap.get(row.event_id) ?? 0;
      attendeeCountMap.set(row.event_id, current + 1);
    });
  }

  const now = new Date();

  const upcoming = events.filter((e) => {
    const start = new Date(e.start_at);
    return start >= now;
  });

  const past = events.filter((e) => {
    const start = new Date(e.start_at);
    return start < now;
  });

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return `${format(d, "EEE d MMM yyyy")} · ${format(d, "h:mm a")}`;
  };

  const formatPropertyLabel = (event: OpenHomeEvent) => {
    const p = propertyMap.get(event.property_id);
    if (!p) return `Property #${event.property_id}`;
    return `${p.street_address}, ${p.suburb} ${p.state} ${p.postcode}`;
  };

  const renderEventCard = (event: OpenHomeEvent) => {
    const propertyLabel = formatPropertyLabel(event);
    const start = formatDateTime(event.start_at);
    const end = event.end_at ? formatDateTime(event.end_at) : null;
    const attendeeCount = attendeeCountMap.get(event.id) ?? 0;

    const attendeeLabel =
      attendeeCount === 0
        ? "No attendees yet"
        : attendeeCount === 1
        ? "1 attendee"
        : `${attendeeCount} attendees`;

    return (
      <Link
        key={event.id}
        href={`/open-homes/${event.id}`}
        className="block rounded-xl border border-zinc-200 bg-white px-4 py-3 hover:border-blue-500 hover:shadow-sm transition"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">
              {event.title || "Open home"}
            </h3>
            <p className="text-sm text-zinc-600">{propertyLabel}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {start}
              {end ? ` – ${end}` : ""}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="inline-flex items-center rounded-full border border-zinc-300 px-2 py-1 text-[11px] font-medium text-zinc-700 bg-zinc-50">
              {attendeeLabel}
            </span>
            <span className="text-[11px] text-blue-600 font-medium">
              View details →
            </span>
          </div>
        </div>

        {event.notes && (
          <p className="mt-2 text-xs text-zinc-500 line-clamp-2">
            Notes: {event.notes}
          </p>
        )}
      </Link>
    );
  };

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold">Open homes</h1>
        <Link
          href="/open-homes/new"
          className="inline-flex items-center rounded-full bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700"
        >
          + Schedule open home
        </Link>
      </div>

      {/* Upcoming */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No upcoming open homes scheduled.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {upcoming.map(renderEventCard)}
          </div>
        )}
      </section>

      {/* Past */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Past</h2>
        {past.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No past open homes recorded yet.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {past
              .slice()
              .reverse() // most recent past first
              .map(renderEventCard)}
          </div>
        )}
      </section>
    </div>
  );
}
