"use client";

import React, { useState, FormEvent } from "react";
import type { Deal } from "./PipelineBoard";

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

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (deal: Deal) => void;
  defaultTitle?: string;
  defaultStage?: Deal["stage"];
  contactId?: number;
  propertyId?: number;
  appraisalId?: number;
};

export function NewDealModal({
  open,
  onClose,
  onCreated,
  defaultTitle = "",
  defaultStage = "lead",
  contactId,
  propertyId,
  appraisalId,
}: Props) {
  const [title, setTitle] = useState(defaultTitle);
  const [stage, setStage] = useState<Deal["stage"]>(defaultStage);
  const [low, setLow] = useState("");
  const [high, setHigh] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setStage(defaultStage);
      setLow("");
      setHigh("");
      setNotes("");
      setError(null);
    }
  }, [open, defaultTitle, defaultStage]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          stage,
          contact_id: contactId ?? null,
          property_id: propertyId ?? null,
          appraisal_id: appraisalId ?? null,
          estimated_value_low: low ? Number(low) : null,
          estimated_value_high: high ? Number(high) : null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create deal");
      }

      const data = await res.json();
      const deal = data.deal as Deal;
      onCreated(deal);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to create deal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">New deal</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-3 space-y-3">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1">
              {error}
            </p>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Title *
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 9 Gannon Glen Mundaring – listing opportunity"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Stage</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              value={stage}
              onChange={(e) => setStage(e.target.value as Deal["stage"])}
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Est. value (low)
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                value={low}
                onChange={(e) => setLow(e.target.value)}
                min="0"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Est. value (high)
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                value={high}
                onChange={(e) => setHigh(e.target.value)}
                min="0"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Notes</label>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 min-h-[70px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key details about the opportunity, timing, motivation, etc."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
