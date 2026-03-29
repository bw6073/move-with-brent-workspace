// src/app/(app)/reports/page.tsx
import React from "react";
import { requireUser } from "@/lib/auth/requireUser";

// ─── helpers ───────────────────────────────────────────────────────────────

function monthStart(offsetMonths: number): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + offsetMonths);
  return d.toISOString();
}

function monthLabel(offsetMonths: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  return d.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
}

function fmtAud(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}

// ─── types ─────────────────────────────────────────────────────────────────

type MonthStat = {
  month: string;
  contacts: number;
  appraisals: number;
  tasksCompleted: number;
  openHomes: number;
  calls: number;
  emails: number;
};

type DealStageRow = {
  stage: string;
  count: number;
  totalLow: number;
  totalHigh: number;
};

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  prospect: "Prospect",
  appraisal: "Appraisal",
  listed: "Listed",
  under_offer: "Under offer",
  sold: "Sold",
  lost: "Lost",
};

// ─── page ──────────────────────────────────────────────────────────────────

export default async function ReportsPage() {
  const { user, supabase } = await requireUser();

  // Build date boundaries for last 6 months
  const months = Array.from({ length: 6 }, (_, i) => {
    const offset = -(5 - i); // -5, -4, ..., 0
    return {
      label: monthLabel(offset),
      start: monthStart(offset),
      end: monthStart(offset + 1),
    };
  });

  const sixMonthsAgo = months[0].start;

  // Fetch raw data for trend calculation
  const [
    { data: contactRows },
    { data: appraisalRows },
    { data: taskRows },
    { data: dealRows },
    { data: openHomeRows },
    { data: activityRows },
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("created_at")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("created_at", sixMonthsAgo),

    supabase
      .from("appraisals")
      .select("created_at")
      .eq("user_id", user.id)
      .gte("created_at", sixMonthsAgo),

    supabase
      .from("tasks")
      .select("created_at, status")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("created_at", sixMonthsAgo),

    supabase
      .from("deals")
      .select("stage, estimated_value_low, estimated_value_high")
      .eq("user_id", user.id)
      .is("deleted_at", null),

    supabase
      .from("open_home_events")
      .select("start_at")
      .eq("user_id", user.id)
      .gte("start_at", sixMonthsAgo),

    supabase
      .from("contact_activities")
      .select("activity_at, activity_type")
      .eq("user_id", user.id)
      .gte("activity_at", sixMonthsAgo),
  ]);

  // Aggregate monthly stats
  const monthStats: MonthStat[] = months.map(({ label, start, end }) => {
    const contacts = (contactRows ?? []).filter(
      (r) => r.created_at >= start && r.created_at < end
    ).length;

    const appraisals = (appraisalRows ?? []).filter(
      (r) => r.created_at >= start && r.created_at < end
    ).length;

    const tasksCompleted = (taskRows ?? []).filter(
      (r) => r.created_at >= start && r.created_at < end && r.status === "completed"
    ).length;

    const openHomes = (openHomeRows ?? []).filter(
      (r) => r.start_at >= start && r.start_at < end
    ).length;

    const calls = (activityRows ?? []).filter(
      (r) => r.activity_at >= start && r.activity_at < end && r.activity_type === "call"
    ).length;

    const emails = (activityRows ?? []).filter(
      (r) => r.activity_at >= start && r.activity_at < end && r.activity_type === "email"
    ).length;

    return { month: label, contacts, appraisals, tasksCompleted, openHomes, calls, emails };
  });

  // This month vs last month comparison
  const thisMonth = monthStats[5];
  const lastMonth = monthStats[4];

  function delta(curr: number, prev: number) {
    const diff = curr - prev;
    if (diff === 0) return null;
    return { diff, positive: diff > 0 };
  }

  // Pipeline by stage
  const stageMap = new Map<string, DealStageRow>();
  for (const d of dealRows ?? []) {
    const key = d.stage ?? "unknown";
    const existing = stageMap.get(key) ?? { stage: key, count: 0, totalLow: 0, totalHigh: 0 };
    existing.count++;
    existing.totalLow += d.estimated_value_low ?? 0;
    existing.totalHigh += d.estimated_value_high ?? 0;
    stageMap.set(key, existing);
  }
  const stageRows = Array.from(stageMap.values()).sort(
    (a, b) =>
      ["lead", "prospect", "appraisal", "listed", "under_offer", "sold", "lost"].indexOf(a.stage) -
      ["lead", "prospect", "appraisal", "listed", "under_offer", "sold", "lost"].indexOf(b.stage)
  );

  const totalPipelineHigh = stageRows
    .filter((r) => !["sold", "lost"].includes(r.stage))
    .reduce((sum, r) => sum + r.totalHigh, 0);

  // Open homes this month
  const thisMonthStart = months[5].start;
  const openHomesThisMonth = (openHomeRows ?? []).filter(
    (r) => r.start_at >= thisMonthStart
  ).length;
  const openHomesLastMonth = (openHomeRows ?? []).filter(
    (r) => r.start_at >= months[4].start && r.start_at < thisMonthStart
  ).length;

  // Peak month
  const peakContacts = monthStats.reduce((max, m) => m.contacts > max.contacts ? m : max, monthStats[0]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">6-month activity summary</p>
      </div>

      {/* ── This month vs last month ───────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          This month vs last month
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "New contacts", curr: thisMonth.contacts, prev: lastMonth.contacts },
            { label: "Appraisals", curr: thisMonth.appraisals, prev: lastMonth.appraisals },
            { label: "Tasks completed", curr: thisMonth.tasksCompleted, prev: lastMonth.tasksCompleted },
            { label: "Open homes", curr: openHomesThisMonth, prev: openHomesLastMonth },
          ].map(({ label, curr, prev }) => {
            const d = delta(curr, prev);
            return (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="mt-1 text-3xl font-bold text-slate-900">{curr}</div>
                <div className="mt-1 text-xs">
                  {d ? (
                    <span className={d.positive ? "text-emerald-600" : "text-red-500"}>
                      {d.positive ? "+" : ""}{d.diff} vs last month
                    </span>
                  ) : (
                    <span className="text-slate-400">Same as last month</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Pipeline summary ──────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Pipeline by stage
          {totalPipelineHigh > 0 && (
            <span className="ml-2 text-slate-900 normal-case font-bold">
              — {fmtAud(totalPipelineHigh)} active
            </span>
          )}
        </h2>
        {stageRows.length === 0 ? (
          <p className="text-sm text-slate-500">No deals yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                  <th className="px-4 py-2 text-left font-medium">Stage</th>
                  <th className="px-4 py-2 text-right font-medium">Deals</th>
                  <th className="px-4 py-2 text-right font-medium">Value range</th>
                </tr>
              </thead>
              <tbody>
                {stageRows.map((row) => (
                  <tr key={row.stage} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2 font-medium text-slate-900">
                      {STAGE_LABELS[row.stage] ?? row.stage}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-700">{row.count}</td>
                    <td className="px-4 py-2 text-right text-slate-500 text-xs">
                      {row.totalLow > 0 || row.totalHigh > 0
                        ? `${fmtAud(row.totalLow)} – ${fmtAud(row.totalHigh)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 6-month trend ──────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          6-month trend
        </h2>
        <div className="overflow-x-auto overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                <th className="px-4 py-2 text-left font-medium">Month</th>
                <th className="px-4 py-2 text-right font-medium">New contacts</th>
                <th className="px-4 py-2 text-right font-medium">Appraisals</th>
                <th className="px-4 py-2 text-right font-medium">Open homes</th>
                <th className="px-4 py-2 text-right font-medium">Calls</th>
                <th className="px-4 py-2 text-right font-medium">Emails</th>
                <th className="px-4 py-2 text-right font-medium">Tasks done</th>
              </tr>
            </thead>
            <tbody>
              {[...monthStats].reverse().map((m) => (
                <tr key={m.month} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-slate-900">{m.month}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{m.contacts > 0 ? m.contacts : <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{m.appraisals > 0 ? m.appraisals : <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{m.openHomes > 0 ? m.openHomes : <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{m.calls > 0 ? m.calls : <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{m.emails > 0 ? m.emails : <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{m.tasksCompleted > 0 ? m.tasksCompleted : <span className="text-slate-300">—</span>}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="border-t border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                <td className="px-4 py-2">6-month total</td>
                <td className="px-4 py-2 text-right">{monthStats.reduce((s, m) => s + m.contacts, 0)}</td>
                <td className="px-4 py-2 text-right">{monthStats.reduce((s, m) => s + m.appraisals, 0)}</td>
                <td className="px-4 py-2 text-right">{monthStats.reduce((s, m) => s + m.openHomes, 0)}</td>
                <td className="px-4 py-2 text-right">{monthStats.reduce((s, m) => s + m.calls, 0)}</td>
                <td className="px-4 py-2 text-right">{monthStats.reduce((s, m) => s + m.emails, 0)}</td>
                <td className="px-4 py-2 text-right">{monthStats.reduce((s, m) => s + m.tasksCompleted, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {peakContacts.contacts > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            Best month for new contacts: <span className="font-medium text-slate-700">{peakContacts.month}</span> ({peakContacts.contacts})
          </p>
        )}
      </section>
    </div>
  );
}
