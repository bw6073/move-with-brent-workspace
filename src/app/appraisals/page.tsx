// src/app/appraisals/page.tsx
import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type AppraisalRow = {
  id: number;
  status: string | null;
  created_at: string | null;
  data: any | null;
};

export default async function AppraisalsIndexPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("No authenticated user in /appraisals", userError);
    return <div>Unauthorised.</div>;
  }

  // 👇 Only select columns we KNOW exist
  const { data, error } = await supabase
    .from("appraisals")
    .select("id, status, created_at, data")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load appraisals", JSON.stringify(error, null, 2));
    return <div>Failed to load appraisals.</div>;
  }

  const rows: AppraisalRow[] = (data ?? []) as AppraisalRow[];

  const formatted = rows.map((row) => {
    const d = (row.data ?? {}) as any;

    const title =
      d.appraisalTitle ||
      d.streetAddress ||
      d.street_address ||
      `Appraisal #${row.id}`;

    const address = d.streetAddress || d.street_address || "";
    const suburb = d.suburb || "";
    const postcode = d.postcode || "";
    const state = d.state || "WA";

    return {
      id: row.id,
      status: row.status ?? "DRAFT",
      title,
      address,
      suburb,
      postcode,
      state,
      created_at: row.created_at,
    };
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Appraisals</h1>
          <p className="text-sm text-slate-500">
            Recent appraisals and drafts.
          </p>
        </div>
        <Link
          href="/appraisals/new"
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          + New appraisal
        </Link>
      </div>

      {formatted.length === 0 ? (
        <p className="text-sm text-slate-500">
          No appraisals yet. Create a new one to get started.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Address</th>
                <th className="px-3 py-2 text-left">Suburb</th>
                <th className="px-3 py-2 text-left">Postcode</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {formatted.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 hover:bg-slate-50/60"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/appraisals/${row.id}/edit`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {row.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.address}</td>
                  <td className="px-3 py-2">{row.suburb}</td>
                  <td className="px-3 py-2">{row.postcode}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                        row.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {row.created_at
                      ? new Date(row.created_at).toLocaleDateString("en-AU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    <div className="inline-flex items-center gap-3">
                      <Link
                        href={`/appraisals/${row.id}/edit`}
                        className="text-slate-600 hover:text-slate-900 hover:underline"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/appraisals/${row.id}/summary`}
                        className="text-slate-500 hover:text-slate-800 hover:underline"
                      >
                        Summary
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
