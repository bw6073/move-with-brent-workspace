// src/app/(app)/properties/page.tsx
import React from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";
import { PropertiesTable, type PropertyItem } from "./PropertiesTable";
import { PropertiesFilterBar } from "./PropertiesFilterBar";

type SearchParams = {
  status?: string;
  property_type?: string;
};

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user, supabase } = await requireUser();
  const filters = await searchParams;

  let query = supabase
    .from("properties")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (filters.status) query = query.eq("market_status", filters.status);
  if (filters.property_type) query = query.eq("property_type", filters.property_type);

  const [{ data, error }, { data: activityData }] = await Promise.all([
    query,
    supabase
      .from("property_activities")
      .select("property_id, activity_at")
      .eq("user_id", user.id)
      .order("activity_at", { ascending: false })
      .limit(2000),
  ]);

  const lastActivityMap = new Map<number, string>();
  for (const a of activityData ?? []) {
    if (!lastActivityMap.has(a.property_id)) {
      lastActivityMap.set(a.property_id, a.activity_at);
    }
  }

  if (error) {
    console.error("Failed to load properties:", error);

    return (
      <div className="mx-auto max-w-5xl px-6 py-6">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Properties
            </h1>
            <p className="text-sm text-slate-500">
              Properties linked to your contacts and appraisals.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/properties/new"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              + New property
            </Link>
            <Link
              href="/appraisals/new"
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              + New appraisal
            </Link>
          </div>
        </header>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          There was a problem loading properties. Please check your Supabase
          table.
        </div>
      </div>
    );
  }

  const rows = (data ?? []) as any[];

  const properties: PropertyItem[] = rows.map((row) => {
    const d = (row.data ?? {}) as any;

    const address =
      d.streetAddress ??
      d.address ??
      row.street_address ??
      row.address ??
      row.display_address ??
      "Untitled property";

    const suburb =
      d.suburb ??
      row.suburb ??
      d.locality ??
      row.locality ??
      d.town ??
      row.town ??
      "";

    const statusFromRow =
      row.market_status ??
      row.status ??
      row.listing_status ??
      row.property_status ??
      row.workflow_status ??
      null;

    const statusFromData =
      d.marketStatus ??
      d.status ??
      d.listingStatus ??
      d.listing_status ??
      d.propertyStatus ??
      d.property_status ??
      d.workflowStatus ??
      d.workflow_status ??
      null;

    const status = statusFromRow ?? statusFromData ?? null;

    const createdRaw: string | null = row.created_at ?? null;

    const created = createdRaw
      ? new Date(createdRaw).toLocaleDateString("en-AU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";

    return {
      id: row.id,
      address,
      suburb,
      status,
      propertyType: row.property_type ?? null,
      createdRaw,
      created,
      lastActivityRaw: lastActivityMap.get(row.id) ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* HEADER */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Properties</h1>
          <p className="text-sm text-slate-500">
            Properties in your CRM. Open a property to view linked contacts and
            appraisals.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/properties/new"
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            + New property
          </Link>
          <Link
            href="/appraisals/new"
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            + New appraisal
          </Link>
        </div>
      </header>

      {/* FILTER BAR */}
      <div className="mb-4">
        <PropertiesFilterBar
          currentStatus={filters.status ?? ""}
          currentPropertyType={filters.property_type ?? ""}
        />
      </div>

      {/* TABLE WITH SORT + PAGINATION */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <PropertiesTable properties={properties} />
      </section>
    </div>
  );
}
