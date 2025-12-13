"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  initialDeal: Deal;
};

const toNumberOrNull = (v: string) => {
  const trimmed = v.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
};

export default function DealDetailClient({ initialDeal }: Props) {
  const router = useRouter();

  const [deal, setDeal] = useState<Deal>(initialDeal);

  // form drafts (so you can type without changing deal until Save)
  const [title, setTitle] = useState(initialDeal.title ?? "");
  const [stage, setStage] = useState<Deal["stage"]>(initialDeal.stage);
  const [low, setLow] = useState(
    initialDeal.estimated_value_low === null ||
      initialDeal.estimated_value_low === undefined
      ? ""
      : String(initialDeal.estimated_value_low)
  );
  const [high, setHigh] = useState(
    initialDeal.estimated_value_high === null ||
      initialDeal.estimated_value_high === undefined
      ? ""
      : String(initialDeal.estimated_value_high)
  );
  const [notes, setNotes] = useState(initialDeal.notes ?? "");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const subtitle = useMemo(() => `Deal #${deal.id}`, [deal.id]);

  // Refresh deal from API (optional but recommended)
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/deals/${initialDeal.id}`, {
          method: "GET",
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(json.error || "Failed to load deal");
        }

        const fresh: Deal = json.deal ?? json;
        if (cancelled) return;

        setDeal(fresh);

        // sync drafts once on load/refresh
        setTitle(fresh.title ?? "");
        setStage(fresh.stage);
        setLow(
          fresh.estimated_value_low === null ||
            fresh.estimated_value_low === undefined
            ? ""
            : String(fresh.estimated_value_low)
        );
        setHigh(
          fresh.estimated_value_high === null ||
            fresh.estimated_value_high === undefined
            ? ""
            : String(fresh.estimated_value_high)
        );
        setNotes(fresh.notes ?? "");
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Failed to load deal");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [initialDeal.id]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    const t = title.trim();
    if (!t) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError(null);
    setOkMsg(null);

    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          stage,
          estimated_value_low: toNumberOrNull(low),
          estimated_value_high: toNumberOrNull(high),
          notes: notes.trim() || null,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Failed to update deal");
      }

      const updated: Deal = json.deal ?? json;
      setDeal(updated);

      setOkMsg("Saved.");
      window.setTimeout(() => setOkMsg(null), 1200);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to update deal");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    if (!window.confirm("Delete this deal from the pipeline?")) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/deals/${deal.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || "Failed to delete deal");
      }

      router.push("/pipeline");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to delete deal");
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900 truncate">
            {title.trim() || deal.title?.trim() || "Untitled deal"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {subtitle}
            {loading ? " · Refreshing…" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => router.push("/pipeline")}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to pipeline
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {(error || okMsg) && (
        <p
          className={[
            "text-xs rounded-md px-2 py-1 border",
            error
              ? "text-red-700 bg-red-50 border-red-100"
              : "text-emerald-700 bg-emerald-50 border-emerald-100",
          ].join(" ")}
        >
          {error ?? okMsg}
        </p>
      )}

      <form onSubmit={handleSave} className="space-y-4 max-w-xl">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Title *</label>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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

        <div className="grid grid-cols-2 gap-3">
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
              inputMode="numeric"
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
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Notes</label>
          <textarea
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 min-h-[80px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Key details about timing, motivation, competition, etc."
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
