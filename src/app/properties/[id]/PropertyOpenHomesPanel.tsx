// app/properties/[id]/PropertyOpenHomesPanel.tsx
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

type Props = {
  propertyId: number;
};

export async function PropertyOpenHomesPanel({ propertyId }: Props) {
  const supabase = await createClient();

  // Load the property (for label – optional but handy)
  const { data: property } = await supabase
    .from("properties")
    .select("id, street_address, suburb, state, postcode")
    .eq("id", propertyId)
    .single<Property>();

  const propertyLabel = property
    ? `${property.street_address}, ${property.suburb} ${property.state} ${property.postcode}`
    : `Property #${propertyId}`;

  // Load all events for this property
  const { data: eventsData = [] } = await supabase
    .from("open_home_events")
    .select("id, property_id, title, start_at, end_at, notes")
    .eq("property_id", propertyId)
    .order("start_at", { ascending: true })
    .returns<OpenHomeEvent[]>();

  const events: OpenHomeEvent[] = eventsData ?? [];
  const now = new Date();

  const upcoming = events.filter((e) => new Date(e.start_at) >= now);
  const past = events.filter((e) => new Date(e.start_at) < now).reverse(); // most recent first

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return `${format(d, "EEE d MMM yyyy")} · ${format(d, "h:mm a")}`;
  };

  const scheduleUrl = `/open-homes/new?propertyId=${propertyId}`;

  return (
    <section className="space-y-4 mt-8">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Open homes</h2>
        <Link
          href={scheduleUrl}
          className="inline-flex items-center rounded-full bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700"
        >
          + Schedule open home
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No open homes scheduled yet for this property.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {/* Upcoming */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-700">Upcoming</h3>
            {upcoming.length === 0 ? (
              <p className="text-xs text-zinc-500">No upcoming open homes.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((e) => (
                  <Link
                    key={e.id}
                    href={`/open-homes/${e.id}`}
                    className="block rounded-xl border border-zinc-200 bg-white px-3 py-2 hover:border-blue-500 hover:shadow-sm transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {e.title || "Open home"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatDateTime(e.start_at)}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          {propertyLabel}
                        </p>
                      </div>
                      <span className="text-[11px] text-blue-600 font-medium">
                        View →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Past */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-700">Past</h3>
            {past.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No past open homes recorded.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {past.map((e) => (
                  <Link
                    key={e.id}
                    href={`/open-homes/${e.id}`}
                    className="block rounded-xl border border-zinc-200 bg-white px-3 py-2 hover:border-blue-500 hover:shadow-sm transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {e.title || "Open home"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatDateTime(e.start_at)}
                        </p>
                      </div>
                      <span className="text-[11px] text-blue-600 font-medium">
                        View →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <p className="text-[11px] text-zinc-400">
        Kiosk link for each open home is on its detail page under &quot;Launch
        kiosk&quot;.
      </p>
    </section>
  );
}
