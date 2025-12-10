// src/app/(app)/contacts/ContactsTable.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

const PAGE_SIZE = 10;

type ContactItem = {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdRaw?: string | null;
  created: string;
};

type Props = {
  contacts: ContactItem[];
};

type SortValue = "created_desc" | "created_asc" | "name_asc" | "name_desc";

const SORT_OPTIONS: { label: string; value: SortValue }[] = [
  { label: "Recently created", value: "created_desc" },
  { label: "Oldest first", value: "created_asc" },
  { label: "Name A–Z (last name)", value: "name_asc" },
  { label: "Name Z–A (last name)", value: "name_desc" },
];

export function ContactsTable({ contacts }: Props) {
  const [sort, setSort] = useState<SortValue>("created_desc");
  const [page, setPage] = useState<number>(1);

  const { pageContacts, totalCount, fromIndex, totalPages } = useMemo(() => {
    const sorted = [...contacts].sort((a, b) => {
      const aLast = (a.lastName || "").toLowerCase();
      const bLast = (b.lastName || "").toLowerCase();
      const aFirst = (a.firstName || "").toLowerCase();
      const bFirst = (b.firstName || "").toLowerCase();

      switch (sort) {
        case "name_asc": {
          const last = aLast.localeCompare(bLast, "en-AU", {
            sensitivity: "base",
          });
          if (last !== 0) return last;
          return aFirst.localeCompare(bFirst, "en-AU", { sensitivity: "base" });
        }
        case "name_desc": {
          const last = bLast.localeCompare(aLast, "en-AU", {
            sensitivity: "base",
          });
          if (last !== 0) return last;
          return bFirst.localeCompare(aFirst, "en-AU", { sensitivity: "base" });
        }
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
      pageContacts: sorted.slice(fromIndex, toIndex),
      totalCount,
      fromIndex,
      totalPages,
    };
  }, [contacts, sort, page]);

  const handleChangeSort = (value: SortValue) => {
    setSort(value);
    setPage(1);
  };

  const handlePrev = () => setPage((p) => Math.max(p - 1, 1));
  const handleNext = () => setPage((p) => p + 1);

  if (contacts.length === 0) {
    return <p className="text-sm text-slate-500">No contacts to display.</p>;
  }

  return (
    <>
      {/* SORT + SUMMARY */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500 sm:text-sm">
          {totalCount} contact{totalCount === 1 ? "" : "s"} · Page {page} of{" "}
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
              <th className="py-2 px-4">Full name</th>
              <th className="py-2 px-4">Email</th>
              <th className="py-2 px-4">Phone</th>
              <th className="py-2 px-4">Created</th>
              <th className="py-2 pl-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {pageContacts.map((c, idx) => (
              <tr
                key={c.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                <td className="py-2 pr-4 text-xs text-slate-400">
                  {fromIndex + idx + 1}
                </td>

                <td className="py-2 px-4 text-slate-900">
                  <Link href={`/contacts/${c.id}`} className="hover:underline">
                    {c.fullName}
                  </Link>
                </td>

                <td className="py-2 px-4 text-slate-700">{c.email || "—"}</td>
                <td className="py-2 px-4 text-slate-700">{c.phone || "—"}</td>
                <td className="py-2 px-4 text-slate-700">{c.created}</td>

                <td className="py-2 pl-4 text-right">
                  <div className="flex justify-end gap-2 text-xs">
                    <Link
                      href={`/contacts/${c.id}`}
                      className="rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100"
                    >
                      View
                    </Link>
                    <Link
                      href={`/appraisals/new?contactId=${c.id}`}
                      className="rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100"
                    >
                      New appraisal
                    </Link>
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
