"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

const PAGE_SIZE = 10;

export type PropertyItem = {
  id: number;
  address: string;
  suburb: string;
  status: string | null;
  createdRaw?: string | null;
  created: string;
};

type Props = {
  properties: PropertyItem[];
};

type SortValue =
  | "created_desc"
  | "created_asc"
  | "address_asc"
  | "address_desc"
  | "suburb_asc"
  | "suburb_desc"
  | "status_asc"
  | "status_desc";

const SORT_OPTIONS: { label: string; value: SortValue }[] = [
  { label: "Recently created", value: "created_desc" },
  { label: "Oldest first", value: "created_asc" },
  { label: "Address A–Z", value: "address_asc" },
  { label: "Address Z–A", value: "address_desc" },
  { label: "Suburb A–Z", value: "suburb_asc" },
  { label: "Suburb Z–A", value: "suburb_desc" },
  { label: "Status A–Z", value: "status_asc" },
  { label: "Status Z–A", value: "status_desc" },
];

const statusClass = (status: string | null | undefined) => {
  switch (status) {
    case "for_sale":
      return "bg-emerald-100 text-emerald-700";
    case "under_offer":
      return "bg-amber-100 text-amber-700";
    case "sold":
      return "bg-slate-200 text-slate-800";
    case "withdrawn":
      return "bg-red-100 text-red-700";
    case "appraisal":
      return "bg-indigo-100 text-indigo-700";
    case "pre_market":
      return "bg-purple-100 text-purple-700";
    case "off_market":
    default:
      return "bg-slate-100 text-slate-700";
  }
};

// 🔹 Helper: pick badge styles based on status text
function getStatusBadge(status: string) {
  const normalised = status.toLowerCase().trim();

  // Current / active stock
  if (
    ["current", "active", "available", "live"].some((s) =>
      normalised.includes(s)
    )
  ) {
    return {
      className:
        "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700",
      label: status,
    };
  }

  // Under offer / pending
  if (
    ["under offer", "under contract", "pending", "subject to"].some((s) =>
      normalised.includes(s)
    )
  ) {
    return {
      className:
        "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800",
      label: status,
    };
  }

  // Sold / settled
  if (["sold", "settled", "completed"].some((s) => normalised.includes(s))) {
    return {
      className:
        "inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-800",
      label: status,
    };
  }

  // Off market / withdrawn / expired
  if (
    ["off market", "withdrawn", "expired", "cancelled", "cancelled"].some((s) =>
      normalised.includes(s)
    )
  ) {
    return {
      className:
        "inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-700",
      label: status,
    };
  }

  // Fallback neutral pill
  return {
    className:
      "inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-700",
    label: status,
  };
}

export function PropertiesTable({ properties }: Props) {
  const [sort, setSort] = useState<SortValue>("created_desc");
  const [page, setPage] = useState<number>(1);

  const { pageItems, totalCount, fromIndex, totalPages } = useMemo(() => {
    const sorted = [...properties].sort((a, b) => {
      const aAddress = (a.address || "").toLowerCase();
      const bAddress = (b.address || "").toLowerCase();
      const aSuburb = (a.suburb || "").toLowerCase();
      const bSuburb = (b.suburb || "").toLowerCase();
      const aStatus = (a.status || "").toLowerCase();
      const bStatus = (b.status || "").toLowerCase();

      switch (sort) {
        case "address_asc":
          return aAddress.localeCompare(bAddress, "en-AU", {
            sensitivity: "base",
          });
        case "address_desc":
          return bAddress.localeCompare(aAddress, "en-AU", {
            sensitivity: "base",
          });
        case "suburb_asc":
          return aSuburb.localeCompare(bSuburb, "en-AU", {
            sensitivity: "base",
          });
        case "suburb_desc":
          return bSuburb.localeCompare(aSuburb, "en-AU", {
            sensitivity: "base",
          });
        case "status_asc":
          return aStatus.localeCompare(bStatus, "en-AU", {
            sensitivity: "base",
          });
        case "status_desc":
          return bStatus.localeCompare(aStatus, "en-AU", {
            sensitivity: "base",
          });
        case "created_asc": {
          const aTime = a.createdRaw ? Date.parse(a.createdRaw) : 0;
          const bTime = b.createdRaw ? Date.parse(b.createdRaw) : 0;
          return aTime - bTime;
        }
        case "created_desc":
        default: {
          const aTime = a.createdRaw ? Date.parse(a.createdRaw) : 0;
          const bTime = b.createdRaw ? Date.parse(b.createdRaw) : 0;
          return bTime - aTime;
        }
      }
    });

    const totalCount = sorted.length;
    const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);
    const safePage = Math.min(Math.max(page, 1), totalPages);

    const fromIndex = (safePage - 1) * PAGE_SIZE;
    const toIndex = fromIndex + PAGE_SIZE;

    return {
      pageItems: sorted.slice(fromIndex, toIndex),
      totalCount,
      fromIndex,
      totalPages,
    };
  }, [properties, sort, page]);

  const handleChangeSort = (value: SortValue) => {
    setSort(value);
    setPage(1);
  };

  const handlePrev = () => setPage((p) => Math.max(p - 1, 1));
  const handleNext = () => setPage((p) => p + 1);

  if (properties.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No properties yet. Click &ldquo;New property&rdquo; to create one.
      </p>
    );
  }

  return (
    <>
      {/* SORT + SUMMARY */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500 sm:text-sm">
          {totalCount} propert{totalCount === 1 ? "y" : "ies"} · Page {page} of{" "}
          {totalPages}
        </p>

        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <span className="text-slate-500">Sort by</span>
          <select
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs sm:text-sm"
            value={sort}
            onChange={(e) => handleChangeSort(e.target.value as SortValue)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 px-4">Address</th>
              <th className="py-2 px-4">Suburb</th>
              <th className="py-2 px-4">Status</th>
              <th className="py-2 px-4">Created</th>
              <th className="py-2 pl-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((p, idx) => (
              <tr
                key={p.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                <td className="py-2 pr-4 text-xs text-slate-400">
                  {fromIndex + idx + 1}
                </td>
                <td className="py-2 px-4 text-slate-900">
                  <Link
                    href={`/properties/${p.id}`}
                    className="hover:underline"
                  >
                    {p.address || "Untitled property"}
                  </Link>
                </td>
                <td className="py-2 px-4 text-slate-700">{p.suburb || "—"}</td>

                {/* 🔹 Status badge */}
                <td className="py-2 px-4">
                  {p.status ? (
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                        p.status
                      )}`}
                    >
                      {p.status.replace(/_/g, " ")}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>

                <td className="py-2 px-4 text-slate-700">{p.created}</td>
                <td className="py-2 pl-4 text-right">
                  <div className="flex justify-end gap-2 text-xs">
                    <Link
                      href={`/properties/${p.id}`}
                      className="rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100"
                    >
                      Open
                    </Link>
                    {/* later: href={`/properties/${p.id}/edit`} if you add an edit route */}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="mt-4 flex flex-col items-center gap-3 border-t border-slate-100 pt-4 text-xs sm:flex-row sm:justify-between sm:text-sm">
          <p className="text-slate-500">
            Showing{" "}
            <span className="font-medium">
              {fromIndex + 1}–{Math.min(fromIndex + PAGE_SIZE, totalCount)}
            </span>{" "}
            of <span className="font-medium">{totalCount}</span>
          </p>

          <div className="inline-flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={page <= 1}
              className={`rounded-full border px-3 py-1 ${
                page <= 1
                  ? "cursor-not-allowed border-slate-200 text-slate-300"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Previous
            </button>

            <span className="text-slate-500">
              Page <span className="font-medium">{page}</span> of{" "}
              <span className="font-medium">{totalPages}</span>
            </span>

            <button
              onClick={handleNext}
              disabled={page >= totalPages}
              className={`rounded-full border px-3 py-1 ${
                page >= totalPages
                  ? "cursor-not-allowed border-slate-200 text-slate-300"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
