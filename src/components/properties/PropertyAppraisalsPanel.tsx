// src/components/properties/PropertyAppraisalsPanel.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Props = {
  propertyId: number;
};

type AppraisalRow = {
  id: number;
  property_id: number | null;
  inspection_date: string | null;
  price_low: number | null;
  price_high: number | null;
  notes: string | null;
  title: string | null;
  status: string | null;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "No inspection date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No inspection date";
  return d.toLocaleDateString("en-AU");
};

const formatRange = (low: number | null, high: number | null) => {
  if (low == null && high == null) return "No price range";
  if (low != null && high != null) {
    return `$${low.toLocaleString()} – $${high.toLocaleString()}`;
  }
  if (low != null) return `From $${low.toLocaleString()}`;
  return `Up to $${high!.toLocaleString()}`;
};

export function PropertyAppraisalsPanel({ propertyId }: Props) {
  const [rows, setRows] = useState<AppraisalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("appraisals")
        .select(
          "id, property_id, inspection_date, price_low, price_high, notes, title, status"
        )
        .eq("property_id", propertyId)
        .order("inspection_date", { ascending: false, nullsFirst: false });

      if (!ignore) {
        if (error) {
          console.error("Failed to load appraisals:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          setError("Could not load appraisals.");
          setRows([]);
        } else {
          setRows(data || []);
        }
        setLoading(false);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [propertyId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Appraisals
        </h3>
        <Link
          href={`/appraisals/new?propertyId=${propertyId}`}
          className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-700"
        >
          + New appraisal
        </Link>
      </div>

      {loading && <p className="text-xs text-slate-500">Loading appraisals…</p>}

      {error && !loading && <p className="text-xs text-red-600">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="text-xs text-slate-500">
          No appraisals linked to this property yet.
        </p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((a) => (
            <Link
              key={a.id}
              href={`/appraisals/${a.id}/edit`}
              className="block rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-slate-900">
                    {a.title || "Appraisal"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {formatRange(a.price_low, a.price_high)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[11px] text-slate-500">
                    {formatDate(a.inspection_date)}
                  </span>
                  {a.status && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-700">
                      {a.status}
                    </span>
                  )}
                </div>
              </div>

              {a.notes && (
                <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">
                  {a.notes}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
