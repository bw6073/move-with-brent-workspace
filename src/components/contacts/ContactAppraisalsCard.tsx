// src/components/contacts/ContactAppraisalsCard.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export type AppraisalSummary = {
  id: number;
  appraisalTitle: string | null;
  streetAddress: string | null;
  suburb: string | null;
  status: string | null;
  created_at: string | null;
};

type Props = {
  contactId: number;
};

export default function ContactAppraisalsCard({ contactId }: Props) {
  const [appraisals, setAppraisals] = useState<AppraisalSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contactId) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/appraisals?contactId=${contactId}`);

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("Failed to load contact's appraisals:", txt);
          if (!cancelled) {
            setError("Could not load appraisals.");
          }
          return;
        }

        const json = await res.json();

        // Supports both `{ items: [...] }` and `[...]`
        const items: AppraisalSummary[] = Array.isArray(json)
          ? json
          : Array.isArray(json.items)
          ? json.items
          : [];

        if (!cancelled) {
          setAppraisals(items);
        }
      } catch (err) {
        console.error("Unexpected error loading contact's appraisals:", err);
        if (!cancelled) {
          setError("Could not load appraisals.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [contactId]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Linked appraisals
          </h2>
          <p className="text-xs text-slate-500">
            Appraisals where this contact is connected.
          </p>
        </div>

        <Link
          href={`/appraisals/new?contactId=${contactId}`}
          className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
        >
          + Appraisal
        </Link>
      </div>

      {loading && <p className="text-xs text-slate-500">Loading appraisals…</p>}

      {error && !loading && <p className="text-xs text-red-600">{error}</p>}

      {!loading && !error && appraisals.length === 0 && (
        <p className="text-xs text-slate-500">
          No appraisals linked yet. Use &ldquo;New appraisal&rdquo; or link this
          contact from within an appraisal (Step 5).
        </p>
      )}

      {!loading && !error && appraisals.length > 0 && (
        <div className="mt-2 space-y-2">
          {appraisals.map((a) => {
            const created = a.created_at
              ? new Date(a.created_at).toLocaleDateString()
              : "—";
            const title =
              a.appraisalTitle || a.streetAddress || `Appraisal #${a.id}`;

            return (
              <Link
                key={a.id}
                href={`/appraisals/${a.id}/edit`}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-900">
                    {title}
                  </div>
                  <div className="truncate text-[11px] text-slate-500">
                    {a.streetAddress}
                    {a.suburb ? `, ${a.suburb}` : ""}
                  </div>
                </div>
                <div className="ml-3 flex flex-col items-end">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                    {a.status || "DRAFT"}
                  </span>
                  <span className="mt-1 text-[10px] text-slate-400">
                    {created}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
