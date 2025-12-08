// src/components/contacts/ContactOpenHomeTimeline.tsx
"use client";

import React from "react";
import Link from "next/link";
import { format } from "date-fns";

export type ContactOpenHomeActivity = {
  attendeeId: string;
  eventId: string;
  eventTitle: string;
  propertyLabel: string;
  propertyId: number | null;
  attendedAt: string | null;
  roleLabel: string;
  leadSource: string | null;
  notes: string | null;
};

type Props = {
  activities: ContactOpenHomeActivity[];
};

const formatDateTime = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "EEE d MMM yyyy · h:mm a");
};

export function ContactOpenHomeTimeline({ activities }: Props) {
  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        No open home visits recorded yet for this contact.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">
        Open home visits
      </h2>

      <ul className="space-y-4">
        {activities.map((item) => (
          <li key={item.attendeeId} className="flex gap-3">
            {/* timeline bullet */}
            <div className="flex flex-col items-center">
              <div className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
              <div className="mt-1 h-full w-px bg-slate-200" />
            </div>

            {/* content */}
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Open home attendance
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    {item.eventTitle}
                  </div>
                  <div className="text-xs text-slate-500">
                    {item.propertyLabel}
                  </div>
                </div>

                <div className="text-right text-xs text-slate-500">
                  {formatDateTime(item.attendedAt)}
                </div>
              </div>

              <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                  Role: {item.roleLabel || "—"}
                </span>
                {item.leadSource && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                    Source: {item.leadSource}
                  </span>
                )}
                <span className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-500">
                  Attendee ID: {item.attendeeId}
                </span>
              </div>

              {item.notes && (
                <p className="mt-1 text-xs text-slate-600 whitespace-pre-wrap">
                  {item.notes}
                </p>
              )}

              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Link
                  href={`/open-homes/${item.eventId}`}
                  className="rounded-full border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
                >
                  View open home
                </Link>

                {item.propertyId && (
                  <Link
                    href={`/properties/${item.propertyId}`}
                    className="rounded-full border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
                  >
                    View property
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
