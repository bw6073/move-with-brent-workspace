// src/app/(app)/contacts/ContactsTable.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { toastSuccess, toastError } from "@/lib/toast";

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
  lastContactedRaw?: string | null;
  stage?: string | null;
  rating?: string | null;
};

const STAGE_BADGE: Record<string, string> = {
  new_enquiry:        "bg-blue-100 text-blue-700",
  active_opportunity: "bg-emerald-100 text-emerald-700",
  appraisal_booked:   "bg-indigo-100 text-indigo-700",
  listed:             "bg-purple-100 text-purple-700",
  sold:               "bg-slate-200 text-slate-700",
  nurture:            "bg-amber-100 text-amber-700",
  inactive:           "bg-slate-100 text-slate-500",
};

const STAGE_LABEL: Record<string, string> = {
  new_enquiry:        "New",
  active_opportunity: "Active",
  appraisal_booked:   "Appraisal",
  listed:             "Listed",
  sold:               "Sold",
  nurture:            "Nurture",
  inactive:           "Inactive",
};

const RATING_BADGE: Record<string, string> = {
  hot:  "bg-red-100 text-red-700",
  warm: "bg-orange-100 text-orange-700",
  cold: "bg-sky-100 text-sky-700",
};

type Props = {
  contacts: ContactItem[];
  initialSort?: string;
};

type SortValue = "created_desc" | "created_asc" | "name_asc" | "name_desc" | "last_contacted_asc";

const SORT_OPTIONS: { label: string; value: SortValue }[] = [
  { label: "Recently created", value: "created_desc" },
  { label: "Oldest first", value: "created_asc" },
  { label: "Name A–Z (last name)", value: "name_asc" },
  { label: "Name Z–A (last name)", value: "name_desc" },
  { label: "Needs follow-up (oldest contact)", value: "last_contacted_asc" },
];

const NOW = Date.now();

function lastContactedLabel(raw: string | null | undefined): {
  label: string;
  cls: string;
} {
  if (!raw) return { label: "Never", cls: "text-red-500 font-medium" };
  const days = Math.floor((NOW - Date.parse(raw)) / 86_400_000);
  const label =
    days === 0 ? "Today" :
    days === 1 ? "Yesterday" :
    days < 30  ? `${days}d ago` :
    days < 60  ? `${days}d ago` :
                 `${days}d ago`;
  const cls =
    days >= 60 ? "text-red-500 font-medium" :
    days >= 30 ? "text-amber-500 font-medium" :
                 "text-slate-600";
  return { label, cls };
}

export function ContactsTable({ contacts, initialSort }: Props) {
  const [sort, setSort] = useState<SortValue>(
    (initialSort as SortValue) ?? "created_desc"
  );
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState("");
  const [loggingCallId, setLoggingCallId] = useState<number | null>(null);
  // map of contact id → ISO timestamp of last logged activity (optimistic)
  const [lastActivityOverrides, setLastActivityOverrides] = useState<Record<number, string>>({});

  const logCall = async (contactId: number) => {
    setLoggingCallId(contactId);
    try {
      const res = await fetch("/api/contact-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          activity_type: "call",
          direction: "outbound",
          activity_at: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setLastActivityOverrides((prev) => ({ ...prev, [contactId]: new Date().toISOString() }));
        toastSuccess("Call logged.");
      } else {
        toastError("Failed to log call.");
      }
    } finally {
      setLoggingCallId(null);
    }
  };

  const { pageContacts, totalCount, fromIndex, totalPages } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? contacts.filter((c) =>
          [c.fullName, c.email, c.phone].some((s) => s?.toLowerCase().includes(q))
        )
      : contacts;

    const sorted = [...filtered].sort((a, b) => {
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
        case "last_contacted_asc": {
          // Never contacted sorts first (oldest/most at-risk)
          const aTime = a.lastContactedRaw ? Date.parse(a.lastContactedRaw) : 0;
          const bTime = b.lastContactedRaw ? Date.parse(b.lastContactedRaw) : 0;
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
  }, [contacts, sort, page, search]);

  const handleChangeSort = (value: SortValue) => {
    setSort(value);
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handlePrev = () => setPage((p) => Math.max(p - 1, 1));
  const handleNext = () => setPage((p) => p + 1);

  if (contacts.length === 0) {
    return <p className="text-sm text-slate-500">No contacts to display.</p>;
  }

  return (
    <>
      {/* SEARCH + SORT + SUMMARY */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search name, email or phone…"
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 w-56"
          />
          <p className="text-xs text-slate-500">
            {totalCount} contact{totalCount === 1 ? "" : "s"} · Page {page}/{totalPages}
          </p>
        </div>

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
              <th className="py-2 px-4">Stage / Rating</th>
              <th className="py-2 px-4">Last contacted</th>
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
                <td className="py-2 px-4">
                  <div className="flex flex-wrap gap-1">
                    {c.stage && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STAGE_BADGE[c.stage] ?? "bg-slate-100 text-slate-600"}`}>
                        {STAGE_LABEL[c.stage] ?? c.stage.replace(/_/g, " ")}
                      </span>
                    )}
                    {c.rating && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${RATING_BADGE[c.rating] ?? "bg-slate-100 text-slate-600"}`}>
                        {c.rating}
                      </span>
                    )}
                    {!c.stage && !c.rating && <span className="text-slate-300 text-xs">—</span>}
                  </div>
                </td>
                <td className="py-2 px-4 text-xs">
                  {(() => {
                    const raw = lastActivityOverrides[c.id] ?? c.lastContactedRaw;
                    const { label, cls } = lastContactedLabel(raw);
                    return <span className={cls}>{label}</span>;
                  })()}
                </td>
                <td className="py-2 px-4 text-slate-700">{c.created}</td>

                <td className="py-2 pl-4 text-right">
                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => logCall(c.id)}
                      disabled={loggingCallId === c.id}
                      className="rounded-full border border-emerald-300 px-3 py-1 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                    >
                      {loggingCallId === c.id ? "Logging…" : "Log call"}
                    </button>
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
