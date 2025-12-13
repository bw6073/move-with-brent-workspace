// src/components/pipeline/PipelineBoard.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type Deal = {
  id: number;
  title: string | null;
  stage:
    | "lead"
    | "nurture"
    | "appraisal"
    | "pre_market"
    | "for_sale"
    | "under_offer"
    | "sold"
    | "lost";
  estimated_value_low: string | null;
  estimated_value_high: string | null;
  confidence: "low" | "medium" | "high" | null;
  next_action_at: string | null;
  created_at: string;
  updated_at: string;
  notes?: string | null;

  contacts?: {
    id: number;
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone_mobile?: string | null;
    email?: string | null;
  } | null;

  properties?: {
    id: number;
    street_address: string | null;
    suburb: string | null;
    state: string | null;
    postcode: string | null;
  } | null;

  appraisals?: {
    id: number;
    status: string | null;
    created_at: string | null;
    updated_at: string | null;
    data: any;
  } | null;
};

const STAGES: { id: Deal["stage"]; label: string }[] = [
  { id: "lead", label: "Lead" },
  { id: "nurture", label: "Nurture" },
  { id: "appraisal", label: "Appraisal" },
  { id: "pre_market", label: "Pre-market" },
  { id: "for_sale", label: "For sale" },
  { id: "under_offer", label: "Under offer" },
  { id: "sold", label: "Sold" },
  { id: "lost", label: "Lost" },
];

const STAGE_STYLES: Record<Deal["stage"], { header: string; badge: string }> = {
  lead: {
    header: "bg-slate-50 border-slate-200",
    badge: "bg-slate-200 text-slate-700",
  },
  nurture: {
    header: "bg-sky-50 border-sky-100",
    badge: "bg-sky-100 text-sky-700",
  },
  appraisal: {
    header: "bg-indigo-50 border-indigo-100",
    badge: "bg-indigo-100 text-indigo-700",
  },
  pre_market: {
    header: "bg-purple-50 border-purple-100",
    badge: "bg-purple-100 text-purple-700",
  },
  for_sale: {
    header: "bg-emerald-50 border-emerald-100",
    badge: "bg-emerald-100 text-emerald-700",
  },
  under_offer: {
    header: "bg-amber-50 border-amber-100",
    badge: "bg-amber-100 text-amber-700",
  },
  sold: {
    header: "bg-slate-100 border-slate-300",
    badge: "bg-slate-300 text-slate-800",
  },
  lost: {
    header: "bg-red-50 border-red-100",
    badge: "bg-red-100 text-red-700",
  },
};

function buildAddressTitle(p?: Deal["properties"] | null) {
  if (!p) return "";
  const street = (p.street_address ?? "").trim();
  const suburb = (p.suburb ?? "").trim();
  const state = (p.state ?? "WA").trim();
  const postcode = (p.postcode ?? "").toString().trim();
  const parts = [street, suburb, state, postcode].filter(Boolean);
  return parts.join(", ");
}

function isPlaceholderTitle(title: string) {
  // catches older behaviour like "Deal for Property #3" or similar
  const t = title.trim().toLowerCase();
  return t.startsWith("deal for property #") || t === "new deal";
}

export function PipelineBoard({ deals }: { deals: Deal[] }) {
  const router = useRouter();

  const [items, setItems] = useState<Deal[]>(deals);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(
    () =>
      STAGES.map((stage) => ({
        ...stage,
        deals: items.filter((d) => d.stage === stage.id),
      })),
    [items]
  );

  const handleDropOnColumn = async (stageId: Deal["stage"]) => {
    if (!draggingId) return;

    const deal = items.find((d) => d.id === draggingId);
    if (!deal || deal.stage === stageId) {
      setDraggingId(null);
      return;
    }

    setError(null);
    setSavingId(deal.id);

    // Optimistic update
    setItems((prev) =>
      prev.map((d) => (d.id === deal.id ? { ...d, stage: stageId } : d))
    );

    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: stageId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update deal");
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to update deal");

      // Revert on error
      setItems((prev) =>
        prev.map((d) => (d.id === deal.id ? { ...d, stage: deal.stage } : d))
      );
    } finally {
      setSavingId(null);
      setDraggingId(null);
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-red-600 border border-red-100 bg-red-50 rounded-md px-2 py-1 inline-block">
          {error}
        </p>
      )}

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr">
        {grouped.map((column) => {
          const style = STAGE_STYLES[column.id];

          return (
            <div
              key={column.id}
              className="rounded-xl bg-slate-50 border border-slate-200 flex flex-col"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = Number(e.dataTransfer.getData("text/plain"));
                setDraggingId(id);
                void handleDropOnColumn(column.id);
              }}
            >
              <div
                className={`px-3 py-2 border-b flex items-center justify-between rounded-t-xl ${style.header}`}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-800">
                  {column.label}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}
                >
                  {column.deals.length}
                </span>
              </div>

              <div className="flex-1 space-y-2 p-2 overflow-y-auto max-h-[480px]">
                {column.deals.map((deal) => {
                  const addressTitle = buildAddressTitle(deal.properties);
                  const rawTitle = (deal.title ?? "").trim();
                  const cardTitle =
                    rawTitle && !isPlaceholderTitle(rawTitle)
                      ? rawTitle
                      : addressTitle || `Deal #${deal.id}`;

                  return (
                    <button
                      key={deal.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", String(deal.id));
                        setDraggingId(deal.id);
                      }}
                      className="w-full text-left rounded-lg bg-white px-3 py-2 shadow-sm border border-slate-200 hover:border-slate-300 hover:shadow-md transition text-sm"
                      onClick={() => router.push(`/pipeline/${deal.id}`)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-slate-800 truncate">
                          {cardTitle}
                        </p>
                        {savingId === deal.id && (
                          <span className="text-[10px] text-slate-500">
                            Saving…
                          </span>
                        )}
                      </div>

                      {/* If title is not the address, show address as subline */}
                      {addressTitle && cardTitle !== addressTitle && (
                        <p className="mt-0.5 text-xs text-slate-600 truncate">
                          {addressTitle}
                        </p>
                      )}

                      {deal.contacts && (
                        <p className="mt-0.5 text-xs text-slate-500 truncate">
                          {deal.contacts.display_name ??
                            [deal.contacts.first_name, deal.contacts.last_name]
                              .filter(Boolean)
                              .join(" ")}
                        </p>
                      )}

                      {(deal.estimated_value_low ||
                        deal.estimated_value_high) && (
                        <p className="mt-1 text-xs font-medium text-slate-800">
                          {formatRange(
                            deal.estimated_value_low,
                            deal.estimated_value_high
                          )}
                        </p>
                      )}

                      {deal.next_action_at && (
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Next action:{" "}
                          {new Date(deal.next_action_at).toLocaleDateString(
                            "en-AU"
                          )}
                        </p>
                      )}
                    </button>
                  );
                })}

                {column.deals.length === 0 && (
                  <div className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg px-2 py-4 text-center">
                    Drag deals here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatRange(low: string | null, high: string | null): string {
  const format = (value: string) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(Number(value));

  if (low && high) return `${format(low)} – ${format(high)}`;
  if (low) return `From ${format(low)}`;
  if (high) return `Up to ${format(high)}`;
  return "";
}
