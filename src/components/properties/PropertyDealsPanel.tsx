"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type DealStage =
  | "lead"
  | "appraisal"
  | "listing_prep"
  | "active"
  | "under_offer"
  | "sold"
  | "lost";

type DealProperty = {
  id: number;
  street_address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
};

type Deal = {
  id: number;
  title: string | null;
  stage: DealStage | null;
  created_at: string | null;
  updated_at: string | null;
  contact_id: number | null;
  property_id: number | null;
  appraisal_id: number | null;

  // Optional join (your /api/deals GET already returns this)
  properties?: DealProperty | null;
};

function stageLabel(stage: DealStage | null | undefined) {
  switch (stage) {
    case "lead":
      return "Lead";
    case "appraisal":
      return "Appraisal";
    case "listing_prep":
      return "Listing prep";
    case "active":
      return "Active";
    case "under_offer":
      return "Under offer";
    case "sold":
      return "Sold";
    case "lost":
      return "Lost";
    default:
      return "—";
  }
}

function stagePillClass(stage: DealStage | null | undefined) {
  switch (stage) {
    case "lead":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "appraisal":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "listing_prep":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "under_offer":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "sold":
      return "bg-slate-200 text-slate-800 border-slate-300";
    case "lost":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

function buildAddressTitle(p?: DealProperty | null) {
  if (!p) return "";
  const parts = [p.street_address, p.suburb, p.state ?? "WA", p.postcode]
    .map((x) => (x ?? "").trim())
    .filter(Boolean);
  return parts.join(", ");
}

export function PropertyDealsPanel({ propertyId }: { propertyId: number }) {
  const [items, setItems] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch(`/api/deals?propertyId=${propertyId}`, {
          method: "GET",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Failed to load deals");

        if (!cancelled) setItems((json.items ?? []) as Deal[]);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Error loading deals");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Deals</h3>

        <Link
          href={`/pipeline/new?propertyId=${propertyId}`}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
        >
          + New deal
        </Link>
      </div>

      {loading ? (
        <p className="mt-2 text-sm text-slate-500">Loading…</p>
      ) : err ? (
        <p className="mt-2 text-sm text-red-600">{err}</p>
      ) : items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No deals linked yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((d) => {
            const title =
              d.title?.trim() ||
              buildAddressTitle(d.properties) ||
              `Deal #${d.id}`;

            return (
              <li
                key={d.id}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {title}
                      </div>

                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          stagePillClass(d.stage),
                        ].join(" ")}
                        title="Deal stage"
                      >
                        {stageLabel(d.stage)}
                      </span>
                    </div>

                    <div className="mt-0.5 text-xs text-slate-500">
                      Deal #{d.id}
                    </div>
                  </div>

                  <Link
                    href={`/pipeline/${d.id}`}
                    className="shrink-0 text-xs font-semibold text-slate-900 hover:underline"
                  >
                    Open →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
