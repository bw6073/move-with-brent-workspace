// src/app/(app)/open-homes/page.tsx
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type OpenHomeRow = {
  id: string;
  property_id: number;
  title: string | null;
  start_at: string;
  end_at: string | null;
  notes: string | null;
  properties?: {
    street_address: string;
    suburb: string;
    state: string;
    postcode: string;
  } | null;
};

export default async function OpenHomesIndexPage() {
  const supabase = await createClient();

  // (Auth is already enforced by (app)/layout,
  // so we don't *need* to check user here for visibility.)

  const { data, error } = await supabase
    .from("open_home_events")
    .select(
      `
      id,
      property_id,
      title,
      start_at,
      end_at,
      notes,
      properties (
        street_address,
        suburb,
        state,
        postcode
      )
    `
    )
    .order("start_at", { ascending: true });

  if (error) {
    console.error("Failed to load open homes", JSON.stringify(error, null, 2));
    return (
      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load open homes.
        </div>
      </div>
    );
  }

  const events: OpenHomeRow[] = (data ?? []).map((row: any) => ({
    id: row.id,
    property_id: row.property_id,
    title: row.title,
    start_at: row.start_at,
    end_at: row.end_at,
    notes: row.notes,
    properties: row.properties ?? null,
  }));

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* Header row, same feel as other pages */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Open homes</h1>
          <p className="text-sm text-slate-500">
            Manage upcoming and past open inspections.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/open-homes/new"
            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
          >
            + Schedule open home
          </Link>
        </div>
      </header>

      {/* Table card */}
      {!events || events.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          No open homes scheduled yet. Use{" "}
          <span className="font-medium">“Schedule open home”</span> to create
          your first one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Property
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Title
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date &amp; time
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const property = event.properties;
                const label = property
                  ? `${property.street_address}, ${property.suburb} ${property.state} ${property.postcode}`
                  : `Property #${event.property_id}`;

                const start = event.start_at ? new Date(event.start_at) : null;

                return (
                  <tr
                    key={event.id}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <td className="px-3 py-2 align-top text-slate-800">
                      {label}
                    </td>
                    <td className="px-3 py-2 align-top text-slate-700">
                      {event.title || "Open home"}
                    </td>
                    <td className="px-3 py-2 align-top text-slate-700">
                      {start
                        ? start.toLocaleString("en-AU", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="max-w-xs px-3 py-2 align-top text-slate-500">
                      <span className="line-clamp-2">{event.notes || "—"}</span>
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      <Link
                        href={`/open-homes/${event.id}`}
                        className="inline-flex rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
