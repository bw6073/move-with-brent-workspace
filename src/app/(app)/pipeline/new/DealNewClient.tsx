// src/app/(app)/pipeline/new/DealNewClient.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DealStage } from "@/lib/deals/stages";
import { DEAL_STAGES, DEAL_STAGE_LABEL } from "@/lib/deals/stages";

type Props = {
  prefillPropertyId: number | null;
};

function toIntOrNull(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i > 0 ? i : null;
}

export default function DealNewClient({ prefillPropertyId }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [stage, setStage] = useState<DealStage>("lead");

  // Keep as string to avoid NaN/Number() issues while typing
  const [propertyIdText, setPropertyIdText] = useState(
    prefillPropertyId ? String(prefillPropertyId) : ""
  );

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const prefilled = useMemo(
    () => Number.isFinite(prefillPropertyId as any) && !!prefillPropertyId,
    [prefillPropertyId]
  );

  const handleCreate = async () => {
    if (saving) return;

    setSaving(true);
    setErr(null);

    try {
      const property_id = toIntOrNull(propertyIdText);

      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // IMPORTANT: if blank, send null so API can build title from property address
          title: title.trim() || null,
          stage,
          property_id,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to create deal");

      const dealId = json.deal?.id ?? json.id;
      if (!dealId) throw new Error("Deal created but no deal ID returned");

      router.push(`/pipeline/${dealId}`);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Create failed");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-2xl px-6 py-8 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-slate-900">New deal</h1>

          <button
            type="button"
            onClick={() => router.push("/pipeline")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
          >
            Back to pipeline
          </button>
        </div>

        {err && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500">
              Title (optional)
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Leave blank to auto-title from the property address"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500">
              Stage
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as DealStage)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {DEAL_STAGES.map((s) => (
                <option key={s} value={s}>
                  {DEAL_STAGE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500">
              Property ID
            </label>
            <input
              value={propertyIdText}
              onChange={(e) => setPropertyIdText(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="e.g. 3"
              inputMode="numeric"
              disabled={prefilled}
              title={
                prefilled
                  ? "This deal was started from a property page"
                  : undefined
              }
            />
            {prefilled && (
              <p className="mt-1 text-[11px] text-slate-500">
                Started from a property page — Property ID is locked.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create deal"}
          </button>
        </div>
      </main>
    </div>
  );
}
