// src/app/(app)/appraisals/AppraisalsTable.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

const PAGE_SIZE = 10;

type AppraisalItem = {
  id: number;
  title: string;
  address: string;
  suburb: string;
  status: string;
  createdRaw?: string | null;
  created: string;
};

type Props = {
  appraisals: AppraisalItem[];
};

type SortValue =
  | "created_desc"
  | "created_asc"
  | "title_asc"
  | "title_desc"
  | "suburb_asc"
  | "suburb_desc";

const SORT_OPTIONS: { label: string; value: SortValue }[] = [
  { label: "Recently created", value: "created_desc" },
  { label: "Oldest first", value: "created_asc" },
  { label: "Title A–Z", value: "title_asc" },
  { label: "Title Z–A", value: "title_desc" },
  { label: "Suburb A–Z", value: "suburb_asc" },
  { label: "Suburb Z–A", value: "suburb_desc" },
];

function StatusPill({ status }: { status: string }) {
  const normalised = status.toLowerCase();

  let bg = "bg-slate-200";
  let text = "text-slate-800";

  if (normalised.includes("draft")) {
    // Draft → Yellow
    bg = "bg-yellow-100";
    text = "text-yellow-800";
  } else if (normalised.includes("complete")) {
    // Complete → Green
    bg = "bg-green-100";
    text = "text-green-800";
  } else if (normalised.includes("sent")) {
    // Sent → Blue
    bg = "bg-blue-100";
    text = "text-blue-800";
  } else if (normalised.includes("archiv")) {
    // Archived → Grey
    bg = "bg-slate-300";
    text = "text-slate-700";
  }

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}
    >
      {status}
    </span>
  );
}

export function AppraisalsTable({ appraisals }: Props) {
  const [sort, setSort] = useState<SortValue>("created_desc");
  const [page, setPage] = useState<number>(1);

  const { pageItems, totalCount, fromIndex, totalPages } = useMemo(() => {
    const sorted = [...appraisals].sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      const aSuburb = a.suburb.toLowerCase();
      const bSuburb = b.suburb.toLowerCase();

      switch (sort) {
        case "title_asc":
          return aTitle.localeCompare(bTitle, "en-AU", { sensitivity: "base" });
        case "title_desc":
          return bTitle.localeCompare(aTitle, "en-AU", { sensitivity: "base" });
        case "suburb_asc":
          return aSuburb.localeCompare(bSuburb, "en-AU", {
            sensitivity: "base",
          });
        case "suburb_desc":
          return bSuburb.localeCompare(aSuburb, "en-AU", {
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
  }, [appraisals, sort, page]);

  const handleChangeSort = (value: SortValue) => {
    setSort(value);
    setPage(1);
  };

  const handlePrev = () => setPage((p) => Math.max(p - 1, 1));
  const handleNext = () => setPage((p) => p + 1);

  if (appraisals.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No appraisals yet. Click &ldquo;New appraisal&rdquo; to create one.
      </p>
    );
  }

  return (
    <>
      {/* SORT + SUMMARY */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500 sm:text-sm">
          {totalCount} appraisal{totalCount === 1 ? "" : "s"} · Page {page} of{" "}
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
              <th className="py-2 px-4">Title</th>
              <th className="py-2 px-4">Address</th>
              <th className="py-2 px-4">Suburb</th>
              <th className="py-2 px-4">Status</th>
              <th className="py-2 px-4">Created</th>
              <th className="py-2 pl-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((a, idx) => (
              <tr
                key={a.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                <td className="py-2 pr-4 text-xs text-slate-400">
                  {fromIndex + idx + 1}
                </td>
                <td className="py-2 px-4 text-slate-900">
                  <Link
                    href={`/appraisals/${a.id}`}
                    className="hover:underline"
                  >
                    {a.title}
                  </Link>
                </td>
                <td className="py-2 px-4 text-slate-700">{a.address || "—"}</td>
                <td className="py-2 px-4 text-slate-700">{a.suburb || "—"}</td>
                <td className="py-2 px-4">
                  {a.status ? <StatusPill status={a.status} /> : "—"}
                </td>
                <td className="py-2 px-4 text-slate-700">{a.created}</td>
                <td className="py-2 pl-4 text-right">
                  <Link
                    href={`/appraisals/${a.id}`}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs hover:bg-slate-100"
                  >
                    Open
                  </Link>
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
