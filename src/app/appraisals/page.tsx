// src/app/appraisals/page.tsx
import React from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";

type AppraisalListItem = {
  id: number;
  appraisalTitle: string | null;
  streetAddress: string | null;
  suburb: string | null;
  status: string | null;
  created_at: string | null;
};

export default async function AppraisalsIndexPage() {
  const { user, supabase } = await requireUser();

  const { data, error } = await supabase
    .from("appraisals")
    .select(
      `
        id,
        status,
        created_at,
        data
      `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load appraisals list:", error);
  }

  const items: AppraisalListItem[] =
    (data ?? []).map((row: any) => {
      const d = (row.data ?? {}) as any;

      return {
        id: row.id,
        appraisalTitle:
          d.appraisalTitle ??
          d.appraisal_title ??
          d.streetAddress ??
          d.street_address ??
          null,
        streetAddress: d.streetAddress ?? d.street_address ?? null,
        suburb: d.suburb ?? null,
        status: row.status ?? d.status ?? null,
        created_at: row.created_at ?? null,
      };
    }) ?? [];

  // newest first, just to be safe
  items.sort((a, b) => {
    const at = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bt - at;
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* HEADER */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Appraisals</h1>
          <p className="text-sm text-slate-500">
            All appraisals captured in your system.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/contacts"
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            View contacts
          </Link>
          <Link
            href="/appraisals/new"
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            + New appraisal
          </Link>
        </div>
      </header>

      {/* CONTENT */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {error && (
          <p className="text-sm text-red-600">Could not load appraisals.</p>
        )}

        {!error && items.length === 0 && (
          <p className="text-sm text-slate-500">
            No appraisals yet. Click &ldquo;New appraisal&rdquo; to create one.
          </p>
        )}

        {!error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-2 pr-4">Title / Address</th>
                  <th className="py-2 px-4">Suburb</th>
                  <th className="py-2 px-4">Status</th>
                  <th className="py-2 px-4">Created</th>
                  <th className="py-2 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => {
                  const created = a.created_at
                    ? new Date(a.created_at).toLocaleDateString("en-AU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "—";

                  const title =
                    a.appraisalTitle || a.streetAddress || `Appraisal #${a.id}`;

                  return (
                    <tr
                      key={a.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-2 pr-4 text-slate-900">
                        <div className="truncate font-medium">{title}</div>
                        <div className="truncate text-xs text-slate-500">
                          {a.streetAddress}
                          {a.suburb ? `, ${a.suburb}` : ""}
                        </div>
                      </td>
                      <td className="py-2 px-4 text-slate-700">
                        {a.suburb || "—"}
                      </td>
                      <td className="py-2 px-4 text-slate-700">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-600">
                          {a.status || "DRAFT"}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-slate-700">{created}</td>
                      <td className="py-2 pl-4 text-right">
                        <Link
                          href={`/appraisals/${a.id}/edit`}
                          className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
