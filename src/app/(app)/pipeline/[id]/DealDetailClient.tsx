// src/app/(app)/pipeline/[id]/DealDetailClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DealStage } from "@/lib/deals/stages";
import { DEAL_STAGES, DEAL_STAGE_LABEL } from "@/lib/deals/stages";

type DealContact = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  phone_mobile: string | null;
  email: string | null;
};

type DealProperty = {
  id: number;
  street_address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
};

type DealAppraisal = {
  id: number;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  data: any;
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

  contacts: DealContact | null;
  properties: DealProperty | null;
  appraisals: DealAppraisal | null;
};

type Props = {
  dealId: number;
};

function stagePillClass(stage: DealStage | null | undefined) {
  switch (stage) {
    case "lead":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "nurture":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "appraisal":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "pre_market":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "for_sale":
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
  const street = (p.street_address ?? "").trim();
  const suburb = (p.suburb ?? "").trim();
  const state = (p.state ?? "WA").trim();
  const postcode = (p.postcode ?? "").toString().trim();
  const parts = [street, suburb, state, postcode].filter(Boolean);
  return parts.join(", ");
}

function buildAppraisalTitle(a?: DealAppraisal | null) {
  if (!a?.data) return "";
  const t = (a.data?.appraisalTitle as string | undefined)?.trim() ?? "";
  if (t) return t;

  const addr = [a.data?.streetAddress, a.data?.suburb]
    .filter(Boolean)
    .join(", ")
    .trim();
  return addr;
}

function isPlaceholderTitle(t: string | null | undefined) {
  const s = (t ?? "").trim();
  if (!s) return true;
  return (
    /^deal\s+for\s+property\s*#\s*\d+$/i.test(s) ||
    /^property\s*#\s*\d+$/i.test(s) ||
    /^new\s+deal$/i.test(s)
  );
}

export default function DealDetailClient({ dealId }: Props) {
  const router = useRouter();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // inline editing
  const [titleDraft, setTitleDraft] = useState("");
  const [stageDraft, setStageDraft] = useState<DealStage | "">("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // delete
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  const headerTitle = useMemo(() => {
    if (!deal) return `Deal #${dealId}`;

    const raw = (deal.title ?? "").trim();
    const addressTitle = buildAddressTitle(deal.properties);
    const appraisalTitle = buildAppraisalTitle(deal.appraisals);

    return (
      (!isPlaceholderTitle(raw) ? raw : "") ||
      addressTitle ||
      appraisalTitle ||
      `Deal #${deal.id}`
    );
  }, [deal, dealId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch(`/api/deals/${dealId}`, { method: "GET" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Failed to load deal");

        const d: Deal = json.deal ?? json;

        if (!cancelled) {
          setDeal(d);
          setTitleDraft(isPlaceholderTitle(d.title) ? "" : d.title ?? "");
          setStageDraft((d.stage ?? "") as any);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Error loading deal");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [dealId]);

  const handleSave = async () => {
    if (!deal) return;
    if (saving) return;

    setSaving(true);
    setSaveMsg(null);

    try {
      const payload: Partial<Deal> = {
        title: titleDraft.trim() || null,
        stage: (stageDraft || null) as any,
      };

      const res = await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to save deal");

      const updated: Deal = json.deal ?? json;
      setDeal(updated);
      setTitleDraft(
        isPlaceholderTitle(updated.title) ? "" : updated.title ?? ""
      );
      setStageDraft((updated.stage ?? "") as any);

      setSaveMsg("Saved.");
      setTimeout(() => setSaveMsg(null), 1200);
    } catch (e: any) {
      setSaveMsg(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deal) return;
    if (deleting) return;

    const ok = window.confirm("Delete this deal? This cannot be undone.");
    if (!ok) return;

    setDeleting(true);
    setDeleteMsg(null);

    try {
      const res = await fetch(`/api/deals/${deal.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to delete deal");

      const goTo = deal.property_id
        ? `/properties/${deal.property_id}`
        : "/pipeline";
      router.push(goTo);
      router.refresh();
    } catch (e: any) {
      setDeleteMsg(e?.message ?? "Delete failed");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-slate-600">
          Loading deal…
        </div>
      </div>
    );
  }

  if (err || !deal) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-red-600">
          {err || "Deal not found."}
        </div>
      </div>
    );
  }

  const contactHref = deal.contact_id ? `/contacts/${deal.contact_id}` : null;
  const propertyHref = deal.property_id
    ? `/properties/${deal.property_id}`
    : null;
  const appraisalHref = deal.appraisal_id
    ? `/appraisals/${deal.appraisal_id}/edit`
    : null;

  const stageLabel =
    deal.stage && DEAL_STAGE_LABEL[deal.stage]
      ? DEAL_STAGE_LABEL[deal.stage]
      : "—";

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-5">
        {/* HEADER */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl md:text-2xl font-semibold text-slate-900">
                  {headerTitle}
                </h1>

                <span
                  className={[
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    stagePillClass(deal.stage),
                  ].join(" ")}
                  title="Deal stage"
                >
                  {stageLabel}
                </span>

                <span className="text-[11px] text-slate-400">
                  Deal #{deal.id}
                </span>
              </div>

              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500">
                    Title
                  </label>
                  <input
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Leave blank to use auto title"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500">
                    Stage
                  </label>
                  <select
                    value={stageDraft}
                    onChange={(e) => setStageDraft(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">—</option>
                    {DEAL_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {DEAL_STAGE_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 md:items-end">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>

              {(saveMsg || deleteMsg) && (
                <div className="text-[11px] text-slate-500">
                  {deleteMsg ? (
                    <span className="text-red-600">{deleteMsg}</span>
                  ) : (
                    saveMsg
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {contactHref && (
                  <Link
                    href={contactHref}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                  >
                    View contact
                  </Link>
                )}
                {propertyHref && (
                  <Link
                    href={propertyHref}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                  >
                    View property
                  </Link>
                )}
                {appraisalHref && (
                  <Link
                    href={appraisalHref}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                  >
                    View appraisal
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
              <h2 className="text-sm font-semibold text-slate-900">Overview</h2>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <div className="text-[11px] font-medium text-slate-500">
                    Created
                  </div>
                  <div className="text-slate-800">{deal.created_at ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500">
                    Last updated
                  </div>
                  <div className="text-slate-800">{deal.updated_at ?? "—"}</div>
                </div>

                <div className="sm:col-span-2">
                  <div className="text-[11px] font-medium text-slate-500">
                    Linked items
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700">
                      Contact: {deal.contact_id ?? "—"}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700">
                      Property: {deal.property_id ?? "—"}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700">
                      Appraisal: {deal.appraisal_id ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
              <h2 className="text-sm font-semibold text-slate-900">Activity</h2>
              <p className="mt-2 text-sm text-slate-600">
                Next we’ll drop in the timeline here (notes + tasks + changes),
                newest first.
              </p>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Notes</h2>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                >
                  + Add note
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Placeholder — we’ll wire this to{" "}
                <code className="text-xs">/api/deals/{deal.id}/notes</code>.
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                >
                  + Add task
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Placeholder — we’ll show open tasks first, then completed.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
