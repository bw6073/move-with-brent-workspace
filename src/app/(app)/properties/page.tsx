// src/app/(app)/properties/page.tsx
import React from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";
import { PropertiesTable, type PropertyItem } from "./PropertiesTable";

export default async function PropertiesPage() {
  const { user, supabase } = await requireUser();

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

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

    // 👇 NOW INCLUDING market_status
    const statusFromRow =
      row.market_status ?? // <-- your actual column
      row.status ??
      row.listing_status ??
      row.property_status ??
      row.workflow_status ??
      null;

    const statusFromData =
      d.marketStatus ?? // in case you ever mirror it into JSON
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
      createdRaw,
      created,
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

      {/* TABLE WITH SORT + PAGINATION */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <PropertiesTable properties={properties} />
      </section>
    </div>
  );
}
