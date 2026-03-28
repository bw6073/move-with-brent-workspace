// src/app/(app)/pipeline/[id]/DealDetailClient.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DealStage } from "@/lib/deals/stages";
import { DEAL_STAGES, DEAL_STAGE_LABEL } from "@/lib/deals/stages";
import { toastSuccess, toastError } from "@/lib/toast";

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
  estimated_value_low: string | null;
  estimated_value_high: string | null;
  confidence: "low" | "medium" | "high" | null;
  next_action_at: string | null;
  notes: string | null;
  contact_id: number | null;
  property_id: number | null;
  appraisal_id: number | null;
  created_at: string | null;
  updated_at: string | null;
  contacts: DealContact | null;
  properties: DealProperty | null;
  appraisals: DealAppraisal | null;
};

type TaskRow = {
  id: number;
  title: string | null;
  status: string | null;
  priority: string | null;
  task_type: string | null;
  due_date: string | null;
  related_contact_id: number | null;
  related_property_id: number | null;
};

type Props = {
  initialDeal: Deal;
  initialTasks: TaskRow[];
};

function stagePillClass(stage: DealStage | null | undefined) {
  switch (stage) {
    case "lead":      return "bg-slate-100 text-slate-700 border-slate-200";
    case "nurture":   return "bg-sky-50 text-sky-700 border-sky-200";
    case "appraisal": return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "pre_market":return "bg-purple-50 text-purple-700 border-purple-200";
    case "for_sale":  return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "under_offer":return "bg-amber-50 text-amber-800 border-amber-200";
    case "sold":      return "bg-slate-200 text-slate-800 border-slate-300";
    case "lost":      return "bg-red-50 text-red-700 border-red-200";
    default:          return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

function buildAddressTitle(p?: DealProperty | null) {
  if (!p) return "";
  const parts = [p.street_address, p.suburb, p.state ?? "WA", p.postcode]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  return parts.join(", ");
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

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtCurrency(v: string | null | undefined) {
  if (!v) return null;
  const n = Number(v);
  if (!n) return null;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DealDetailClient({ initialDeal, initialTasks }: Props) {
  const router = useRouter();

  const [deal, setDeal] = useState<Deal>(initialDeal);
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);

  const [titleDraft, setTitleDraft] = useState(
    isPlaceholderTitle(initialDeal.title) ? "" : initialDeal.title ?? ""
  );
  const [stageDraft, setStageDraft] = useState<DealStage | "">(
    (initialDeal.stage ?? "") as DealStage | ""
  );
  const [valueLowDraft, setValueLowDraft] = useState(
    initialDeal.estimated_value_low ?? ""
  );
  const [valueHighDraft, setValueHighDraft] = useState(
    initialDeal.estimated_value_high ?? ""
  );
  const [confidenceDraft, setConfidenceDraft] = useState(
    initialDeal.confidence ?? ""
  );
  const [nextActionDraft, setNextActionDraft] = useState(
    initialDeal.next_action_at?.slice(0, 10) ?? ""
  );
  const [notesDraft, setNotesDraft] = useState(initialDeal.notes ?? "");

  const headerTitle = useMemo(() => {
    const raw = (deal.title ?? "").trim();
    const addressTitle = buildAddressTitle(deal.properties);
    return (
      (!isPlaceholderTitle(raw) ? raw : "") ||
      addressTitle ||
      `Deal #${deal.id}`
    );
  }, [deal]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleDraft.trim() || null,
          stage: stageDraft || null,
          estimated_value_low: valueLowDraft ? String(valueLowDraft) : null,
          estimated_value_high: valueHighDraft ? String(valueHighDraft) : null,
          confidence: confidenceDraft || null,
          next_action_at: nextActionDraft || null,
          notes: notesDraft.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to save deal");
      setDeal(json.deal ?? json);
      toastSuccess("Deal saved.");
    } catch (e: any) {
      toastError(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    const ok = window.confirm("Delete this deal? This cannot be undone.");
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to delete deal");
      router.push(deal.property_id ? `/properties/${deal.property_id}` : "/pipeline");
      router.refresh();
    } catch (e: any) {
      toastError(e?.message ?? "Delete failed");
      setDeleting(false);
    }
  };

  const toggleTask = async (task: TaskRow) => {
    if (completingId === task.id) return;
    const newStatus = task.status === "done" ? "pending" : "done";
    setCompletingId(task.id);
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update task");
    } catch {
      // Revert
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
      toastError("Failed to update task.");
    } finally {
      setCompletingId(null);
    }
  };

  const openTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");

  const contactName = deal.contacts
    ? [deal.contacts.first_name, deal.contacts.last_name].filter(Boolean).join(" ") || `Contact #${deal.contact_id}`
    : null;
  const propertyAddress = buildAddressTitle(deal.properties) || (deal.property_id ? `Property #${deal.property_id}` : null);

  const valueLow = fmtCurrency(deal.estimated_value_low);
  const valueHigh = fmtCurrency(deal.estimated_value_high);
  const valueDisplay =
    valueLow && valueHigh && deal.estimated_value_low !== deal.estimated_value_high
      ? `${valueLow} – ${valueHigh}`
      : valueHigh || valueLow;

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-5">

        {/* HEADER CARD */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <h1 className="truncate text-xl font-semibold text-slate-900">
                  {headerTitle}
                </h1>
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    stagePillClass(deal.stage),
                  ].join(" ")}
                >
                  {deal.stage ? DEAL_STAGE_LABEL[deal.stage] : "—"}
                </span>
                <span className="text-[11px] text-slate-400">Deal #{deal.id}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Title</label>
                  <input
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Leave blank for auto title"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Stage</label>
                  <select
                    value={stageDraft}
                    onChange={(e) => setStageDraft(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">—</option>
                    {DEAL_STAGES.map((s) => (
                      <option key={s} value={s}>{DEAL_STAGE_LABEL[s]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Confidence</label>
                  <select
                    value={confidenceDraft}
                    onChange={(e) => setConfidenceDraft(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">—</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Est. value low ($)</label>
                  <input
                    type="number"
                    value={valueLowDraft}
                    onChange={(e) => setValueLowDraft(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="e.g. 800000"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Est. value high ($)</label>
                  <input
                    type="number"
                    value={valueHighDraft}
                    onChange={(e) => setValueHighDraft(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="e.g. 900000"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Next action date</label>
                  <input
                    type="date"
                    value={nextActionDraft}
                    onChange={(e) => setNextActionDraft(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Notes</label>
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="Add notes about this deal…"
                />
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

              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href="/pipeline"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  ← Pipeline
                </Link>
                {deal.contact_id && (
                  <Link
                    href={`/contacts/${deal.contact_id}`}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                  >
                    View contact
                  </Link>
                )}
                {deal.property_id && (
                  <Link
                    href={`/properties/${deal.property_id}`}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                  >
                    View property
                  </Link>
                )}
                {deal.appraisal_id && (
                  <Link
                    href={`/appraisals/${deal.appraisal_id}/edit`}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                  >
                    View appraisal
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* OVERVIEW + TASKS */}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">

            {/* OVERVIEW */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Overview</h2>
              <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                {contactName && (
                  <div>
                    <dt className="text-[11px] font-medium text-slate-500">Contact</dt>
                    <dd>
                      <Link href={`/contacts/${deal.contact_id}`} className="text-slate-800 hover:underline">
                        {contactName}
                      </Link>
                      {deal.contacts?.phone_mobile && (
                        <div className="text-xs text-slate-500">{deal.contacts.phone_mobile}</div>
                      )}
                      {deal.contacts?.email && (
                        <div className="text-xs text-slate-500">{deal.contacts.email}</div>
                      )}
                    </dd>
                  </div>
                )}

                {propertyAddress && (
                  <div>
                    <dt className="text-[11px] font-medium text-slate-500">Property</dt>
                    <dd>
                      <Link href={`/properties/${deal.property_id}`} className="text-slate-800 hover:underline">
                        {propertyAddress}
                      </Link>
                    </dd>
                  </div>
                )}

                {valueDisplay && (
                  <div>
                    <dt className="text-[11px] font-medium text-slate-500">Estimated value</dt>
                    <dd className="font-medium text-slate-800">{valueDisplay}</dd>
                  </div>
                )}

                {deal.next_action_at && (
                  <div>
                    <dt className="text-[11px] font-medium text-slate-500">Next action</dt>
                    <dd className="text-slate-800">{fmtDate(deal.next_action_at)}</dd>
                  </div>
                )}

                <div>
                  <dt className="text-[11px] font-medium text-slate-500">Created</dt>
                  <dd className="text-slate-700">{fmtDate(deal.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-slate-500">Last updated</dt>
                  <dd className="text-slate-700">{fmtDate(deal.updated_at)}</dd>
                </div>
              </dl>
            </section>

            {/* TASKS */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Tasks
                  {openTasks.length > 0 && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                      {openTasks.length}
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2">
                  {deal.property_id && (
                    <Link
                      href={`/tasks/new?propertyId=${deal.property_id}`}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                    >
                      + New task
                    </Link>
                  )}
                  {deal.property_id && (
                    <Link
                      href={`/tasks?propertyId=${deal.property_id}`}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      All tasks →
                    </Link>
                  )}
                </div>
              </div>

              {tasks.length === 0 ? (
                <p className="text-sm text-slate-500">No tasks linked to this deal yet.</p>
              ) : (
                <div className="space-y-1">
                  {openTasks.map((task) => (
                    <TaskItem key={task.id} task={task} onToggle={toggleTask} completing={completingId === task.id} />
                  ))}
                  {doneTasks.length > 0 && (
                    <>
                      {openTasks.length > 0 && <div className="border-t border-slate-100 my-2" />}
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 mb-1">Completed</p>
                      {doneTasks.map((task) => (
                        <TaskItem key={task.id} task={task} onToggle={toggleTask} completing={completingId === task.id} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Deal details</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[11px] font-medium text-slate-500">Stage</dt>
                  <dd>
                    <span className={["inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", stagePillClass(deal.stage)].join(" ")}>
                      {deal.stage ? DEAL_STAGE_LABEL[deal.stage] : "—"}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[11px] font-medium text-slate-500">Confidence</dt>
                  <dd className="text-[11px] text-slate-700 capitalize">{deal.confidence ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[11px] font-medium text-slate-500">Est. value</dt>
                  <dd className="text-[11px] font-medium text-slate-800">{valueDisplay ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[11px] font-medium text-slate-500">Next action</dt>
                  <dd className="text-[11px] text-slate-700">{fmtDate(deal.next_action_at)}</dd>
                </div>
              </dl>

              {deal.notes && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-medium text-slate-500 mb-1">Notes</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{deal.notes}</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function TaskItem({
  task,
  onToggle,
  completing,
}: {
  task: TaskRow;
  onToggle: (t: TaskRow) => void;
  completing: boolean;
}) {
  const done = task.status === "done";
  const overdue =
    !done && task.due_date && new Date(task.due_date) < new Date();

  return (
    <label className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50 cursor-pointer">
      <input
        type="checkbox"
        checked={done}
        disabled={completing}
        onChange={() => onToggle(task)}
        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-slate-700 focus:ring-slate-300"
      />
      <span className="flex-1 min-w-0">
        <span className={["text-sm", done ? "line-through text-slate-400" : "text-slate-800"].join(" ")}>
          {task.title ?? `Task #${task.id}`}
        </span>
        {task.due_date && (
          <span className={["ml-2 text-[11px]", overdue ? "text-red-500 font-medium" : "text-slate-400"].join(" ")}>
            {new Date(task.due_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
            {overdue && " overdue"}
          </span>
        )}
      </span>
      <span className={["mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", priorityDot(task.priority)].join(" ")} title={task.priority ?? ""} />
    </label>
  );
}

function priorityDot(p: string | null) {
  if (p === "high") return "bg-red-400";
  if (p === "normal") return "bg-amber-400";
  return "bg-slate-300";
}
