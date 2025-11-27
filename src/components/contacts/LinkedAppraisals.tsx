"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type LinkedAppraisalsProps = {
  contactId: number;
};

type AppraisalRow = {
  id: number;
  data: any;
  contactIds: number[];
};

export default function LinkedAppraisals({ contactId }: LinkedAppraisalsProps) {
  const [loading, setLoading] = useState(true);
  const [appraisals, setAppraisals] = useState<AppraisalRow[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const res = await fetch(`/api/contacts/${contactId}/appraisals`);
      const json = await res.json();

      setAppraisals(json.appraisals ?? []);
      setLoading(false);
    };

    if (contactId) {
      void load();
    }
  }, [contactId]);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading appraisals…</div>;
  }

  if (appraisals.length === 0) {
    return (
      <div className="text-sm text-slate-500">
        No appraisals linked to this contact yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appraisals.map((a) => (
        <div
          key={a.id}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-slate-800">
              {a.data?.appraisalTitle || `Appraisal #${a.id}`}
            </h3>

            <Link
              href={`/appraisals/${a.id}/edit`}
              className="rounded-md bg-slate-900 px-3 py-1 text-sm text-white hover:bg-slate-700"
            >
              Edit
            </Link>
          </div>

          <p className="mt-1 text-sm text-slate-600">
            {a.data?.streetAddress}, {a.data?.suburb} {a.data?.postcode}
          </p>

          <p className="text-xs text-slate-400 mt-2">
            Linked contacts: {a.contactIds.join(", ")}
          </p>
        </div>
      ))}
    </div>
  );
}
