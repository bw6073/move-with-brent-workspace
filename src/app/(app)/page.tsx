// src/app/page.tsx
import React from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";
import { DashboardTaskList } from "@/components/dashboard/DashboardTaskList";

// ───────────────── TYPES ─────────────────

type HomeTaskRow = {
  id: number;
  title: string;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  related_contact_id: number | null;
  related_property_id: number | null;
  created_at: string | null;
};

type HomeAppraisalRow = {
  id: number;
  title: string;
  streetAddress: string | null;
  suburb: string | null;
  status: string | null;
  created_at: string | null;
};

type HomeContactRow = {
  id: number;
  displayName: string;
  email: string | null;
  phone: string | null;
  created_at: string | null;
};

type OpenHomeEvent = {
  id: string;
  property_id: number;
  title: string | null;
  start_at: string;
  end_at: string | null;
  notes: string | null;
};

type OpenHomeProperty = {
  id: number;
  street_address: string;
  suburb: string;
  state: string;
  postcode: string;
};

// ───────────────── HELPERS ─────────────────

const formatDate = (iso: string | null) => {
  if (!iso) return "No due date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No due date";
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatCreated = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTimeShort = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};


// ───────────────── PAGE ─────────────────

export default async function HomePage() {
  const { user, supabase } = await requireUser();

  // ── TASKS SNAPSHOT ─────────────────────
  const { data: taskData, error: taskError } = await supabase
    .from("tasks")
    .select(
      `
      id,
      title,
      status,
      priority,
      due_date,
      related_contact_id,
      related_property_id,
      created_at
    `
    )
    .eq("user_id", user.id)
    .in("status", ["pending", "in_progress"])
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(20);

  if (taskError) {
    console.error("[HomePage] tasks error", taskError);
  }

  const allTasks: HomeTaskRow[] = (taskData ?? []).map((row: any) => ({
    id: row.id,
    title: row.title ?? "Untitled task",
    status: row.status ?? "pending",
    priority: row.priority ?? "normal",
    due_date: row.due_date ?? null,
    related_contact_id: row.related_contact_id ?? null,
    related_property_id: row.related_property_id ?? null,
    created_at: row.created_at ?? null,
  }));

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let openCount = allTasks.length;
  let overdueCount = 0;
  let todayCount = 0;
  let upcomingCount = 0;
  let noDueCount = 0;

  for (const t of allTasks) {
    if (!t.due_date) {
      noDueCount++;
      continue;
    }
    const due = new Date(t.due_date);
    if (Number.isNaN(due.getTime())) {
      noDueCount++;
      continue;
    }
    if (due.getTime() < todayStart.getTime()) {
      overdueCount++;
    } else if (
      due.getTime() >= todayStart.getTime() &&
      due.getTime() <= todayEnd.getTime()
    ) {
      todayCount++;
    } else if (due.getTime() > todayEnd.getTime()) {
      upcomingCount++;
    }
  }

  const tasks = allTasks.slice(0, 10);

  // ── RECENT APPRAISALS ──────────────────
  const { data: appraisalData } = await supabase
    .from("appraisals")
    .select("*")
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentAppraisals: HomeAppraisalRow[] = (appraisalData ?? []).map(
    (row: any) => {
      const d = (row.data ?? {}) as any;

      const title =
        d.appraisalTitle ??
        d.appraisal_title ??
        d.streetAddress ??
        d.street_address ??
        row.street_address ??
        `Appraisal #${row.id}`;

      return {
        id: row.id,
        title,
        streetAddress:
          d.streetAddress ?? d.street_address ?? row.street_address ?? null,
        suburb: d.suburb ?? row.suburb ?? null,
        status: row.status ?? d.status ?? null,
        created_at: row.created_at ?? null,
      };
    }
  );

  // ── RECENT CONTACTS ────────────────────
  const { data: contactData } = await supabase
    .from("contacts")
    .select("*")
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentContacts: HomeContactRow[] = (contactData ?? []).map((c: any) => {
    const displayName =
      c.full_name ||
      c.name ||
      [c.first_name, c.last_name].filter(Boolean).join(" ") ||
      "Unnamed contact";

    const phone = c.phone_mobile || c.mobile || c.phone || null;

    return {
      id: c.id,
      displayName,
      email: c.email ?? null,
      phone,
      created_at: c.created_at ?? null,
    };
  });

  // ── PIPELINE BY STAGE ─────────────────
  const { data: dealData } = await supabase
    .from("deals")
    .select("stage, estimated_value_low, estimated_value_high")
    .eq("user_id", user.id)
    .is("deleted_at", null);

  type DealStageGroup = {
    count: number;
    valueLow: number;
    valueHigh: number;
  };

  const DEAL_STAGE_ORDER = ["lead", "prospect", "appraisal", "listed", "under_offer", "sold", "lost"];
  const pipelineByStage = new Map<string, DealStageGroup>();

  for (const deal of dealData ?? []) {
    const stage = deal.stage ?? "lead";
    const existing = pipelineByStage.get(stage) ?? { count: 0, valueLow: 0, valueHigh: 0 };
    pipelineByStage.set(stage, {
      count: existing.count + 1,
      valueLow: existing.valueLow + (deal.estimated_value_low ?? 0),
      valueHigh: existing.valueHigh + (deal.estimated_value_high ?? 0),
    });
  }

  const pipelineStages = DEAL_STAGE_ORDER
    .filter((s) => pipelineByStage.has(s))
    .map((s) => ({ stage: s, ...pipelineByStage.get(s)! }));

  // ── CONTACT FUNNEL ─────────────────────
  const { data: contactFunnelData } = await supabase
    .from("contacts")
    .select("stage")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(500);

  const contactByStage = new Map<string, number>();
  for (const c of contactFunnelData ?? []) {
    const stage = c.stage ?? "none";
    contactByStage.set(stage, (contactByStage.get(stage) ?? 0) + 1);
  }
  const contactFunnel = Array.from(contactByStage.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const totalContacts = contactFunnelData?.length ?? 0;

  // ── COLD CONTACTS COUNT ───────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentActivityData } = await supabase
    .from("contact_activities")
    .select("contact_id")
    .eq("user_id", user.id)
    .gte("activity_at", thirtyDaysAgo.toISOString());

  const recentlyContactedIds = new Set(
    (recentActivityData ?? []).map((a: any) => a.contact_id)
  );
  const coldContactCount = Math.max(0, totalContacts - recentlyContactedIds.size);

  // ── OPEN HOMES SNAPSHOT ────────────────
  const { data: openHomeData, error: openHomeError } = await supabase
    .from("open_home_events")
    .select("id, property_id, title, start_at, end_at, notes")
    .order("start_at", { ascending: true })
    .limit(20);

  if (openHomeError) {
    console.error("[HomePage] open_home_events error", openHomeError);
  }

  const openHomeEvents: OpenHomeEvent[] = (openHomeData ?? []).map(
    (row: any) => ({
      id: row.id,
      property_id: row.property_id,
      title: row.title ?? null,
      start_at: row.start_at,
      end_at: row.end_at ?? null,
      notes: row.notes ?? null,
    })
  );

  const now = new Date();

  const upcomingOpenHomes = openHomeEvents
    .filter((e) => {
      const start = new Date(e.start_at);
      return start.getTime() >= now.getTime();
    })
    .slice(0, 5);

  const pastOpenHomes = openHomeEvents
    .filter((e) => {
      const start = new Date(e.start_at);
      return start.getTime() < now.getTime();
    })
    .sort((a, b) => {
      // most recent first in the slice
      return new Date(b.start_at).getTime() - new Date(a.start_at).getTime();
    })
    .slice(0, 5);

  // Load properties for those open homes
  const openHomePropertyIds = Array.from(
    new Set(openHomeEvents.map((e) => e.property_id).filter(Boolean))
  );

  const propertyMap = new Map<number, OpenHomeProperty>();

  if (openHomePropertyIds.length > 0) {
    const { data: openHomeProperties } = await supabase
      .from("properties")
      .select("id, street_address, suburb, state, postcode")
      .in("id", openHomePropertyIds);

    (openHomeProperties ?? []).forEach((p: any) => {
      propertyMap.set(p.id, {
        id: p.id,
        street_address: p.street_address,
        suburb: p.suburb,
        state: p.state,
        postcode: p.postcode,
      });
    });
  }

  const formatOpenHomePropertyLabel = (event: OpenHomeEvent) => {
    const p = propertyMap.get(event.property_id);
    if (!p) return `Property #${event.property_id}`;
    return `${p.street_address}, ${p.suburb} ${p.state} ${p.postcode}`;
  };

  // ───────────────── UI ───────────────────

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Move With Brent – Workspace
          </h1>
          <p className="text-slate-600">
            Quick access to your core tools and today&apos;s priorities.
          </p>
        </div>
      </header>

      {/* TODAY'S FOCUS */}
      {(overdueCount > 0 || todayCount > 0 || coldContactCount > 0) && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-amber-900">Today's focus</h2>
          <div className="grid gap-3 sm:grid-cols-3">

            {/* Overdue tasks */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-red-600">
                Overdue ({overdueCount})
              </p>
              {overdueCount === 0 ? (
                <p className="text-xs text-slate-500">Nothing overdue.</p>
              ) : (
                <ul className="space-y-1">
                  {allTasks
                    .filter(
                      (t) =>
                        t.due_date &&
                        new Date(t.due_date).getTime() < todayStart.getTime()
                    )
                    .slice(0, 5)
                    .map((t) => (
                      <li key={t.id} className="text-xs">
                        <Link
                          href={`/tasks/${t.id}/edit`}
                          className="font-medium text-red-700 hover:underline line-clamp-1"
                        >
                          {t.title}
                        </Link>
                        <span className="ml-1 text-red-400">{formatDate(t.due_date)}</span>
                      </li>
                    ))}
                  {overdueCount > 5 && (
                    <li>
                      <Link href="/tasks?status=pending" className="text-xs text-red-500 hover:underline">
                        +{overdueCount - 5} more →
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* Due today */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
                Due today ({todayCount})
              </p>
              {todayCount === 0 ? (
                <p className="text-xs text-slate-500">Nothing due today.</p>
              ) : (
                <ul className="space-y-1">
                  {allTasks
                    .filter(
                      (t) =>
                        t.due_date &&
                        new Date(t.due_date).getTime() >= todayStart.getTime() &&
                        new Date(t.due_date).getTime() <= todayEnd.getTime()
                    )
                    .slice(0, 5)
                    .map((t) => (
                      <li key={t.id}>
                        <Link
                          href={`/tasks/${t.id}/edit`}
                          className="text-xs font-medium text-amber-800 hover:underline line-clamp-1"
                        >
                          {t.title}
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {/* Cold contacts */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Going cold ({coldContactCount})
              </p>
              {coldContactCount === 0 ? (
                <p className="text-xs text-slate-500">All contacts touched recently.</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-slate-600">
                    {coldContactCount} contact{coldContactCount !== 1 ? "s" : ""} with no activity in 30+ days.
                  </p>
                  <Link
                    href="/contacts?sort=last_contacted_asc"
                    className="text-xs font-medium text-slate-700 hover:underline"
                  >
                    View who needs follow-up →
                  </Link>
                </div>
              )}
            </div>

          </div>
        </section>
      )}

      {/* QUICK NAV CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/contacts"
          className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm hover:bg-slate-50"
        >
          <h2 className="text-lg font-semibold text-slate-900">Contacts</h2>
          <p className="mt-1 text-sm text-slate-600">
            Manage buyers, sellers and all your relationships.
          </p>
        </Link>

        <Link
          href="/properties"
          className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm hover:bg-slate-50"
        >
          <h2 className="text-lg font-semibold text-slate-900">Properties</h2>
          <p className="mt-1 text-sm text-slate-600">
            Keep track of listings, appraisals and pipeline.
          </p>
        </Link>

        <Link
          href="/appraisals"
          className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm hover:bg-slate-50"
        >
          <h2 className="text-lg font-semibold text-slate-900">Appraisals</h2>
          <p className="mt-1 text-sm text-slate-600">
            Create, edit and manage property appraisals.
          </p>
        </Link>

        <Link
          href="/tasks"
          className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm hover:bg-slate-50"
        >
          <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
          <p className="mt-1 text-sm text-slate-600">
            View and manage tasks across your workflow.
          </p>
        </Link>
      </div>

      {/* TASK METRICS STRIP */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Open tasks
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {openCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Overdue
          </p>
          <p className="mt-1 text-xl font-semibold text-red-600">
            {overdueCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Due today
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {todayCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Upcoming
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {upcomingCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            No due date
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {noDueCount}
          </p>
        </div>
      </section>

      {/* PIPELINE + CONTACT FUNNEL */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* PIPELINE BY STAGE */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Pipeline by stage</h2>
            <Link href="/pipeline" className="text-[11px] font-medium text-slate-600 hover:underline">
              View pipeline
            </Link>
          </div>
          {pipelineStages.length === 0 ? (
            <p className="text-xs text-slate-500">No deals yet. Add one from the Pipeline page.</p>
          ) : (
            <ul className="space-y-2">
              {pipelineStages.map(({ stage, count, valueLow, valueHigh }) => {
                const label = stage.replace(/_/g, " ");
                const valueDisplay = valueHigh > 0
                  ? `$${(valueLow / 1000).toFixed(0)}k–$${(valueHigh / 1000).toFixed(0)}k`
                  : valueLow > 0
                  ? `$${(valueLow / 1000).toFixed(0)}k`
                  : null;
                return (
                  <li key={stage} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                      <span className="capitalize text-slate-700">{label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {valueDisplay && <span className="font-medium text-slate-700">{valueDisplay}</span>}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5">{count} deal{count !== 1 ? "s" : ""}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* CONTACT FUNNEL */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Contact funnel</h2>
            <Link href="/contacts" className="text-[11px] font-medium text-slate-600 hover:underline">
              View contacts
            </Link>
          </div>
          {contactFunnel.length === 0 ? (
            <p className="text-xs text-slate-500">No contacts yet. Add contacts to see your funnel.</p>
          ) : (
            <ul className="space-y-2">
              {contactFunnel.map(([stage, count]) => {
                const label = stage === "none" ? "No stage" : stage.replace(/_/g, " ");
                const pct = totalContacts > 0 ? Math.round((count / totalContacts) * 100) : 0;
                return (
                  <li key={stage} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize text-slate-700">{label}</span>
                      <span className="text-xs text-slate-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-slate-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* MAIN GRID: TASKS + RIGHT SIDE (open homes + recent activity) */}
      <section className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* TASK SNAPSHOT */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                My tasks (snapshot)
              </h2>
              <p className="text-xs text-slate-500">
                Overdue, today and upcoming tasks.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/tasks/new"
                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
              >
                + New task
              </Link>
              <Link
                href="/tasks"
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                View all
              </Link>
            </div>
          </div>

          <DashboardTaskList tasks={tasks} />
        </div>

        {/* RIGHT COLUMN: open homes + recent activity */}
        <div className="space-y-4">
          {/* OPEN HOMES SNAPSHOT */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Open homes
              </h2>
              <div className="flex gap-2">
                <Link
                  href="/open-homes/new"
                  className="rounded-full bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700"
                >
                  + Schedule
                </Link>
                <Link
                  href="/open-homes"
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                >
                  View all
                </Link>
              </div>
            </div>

            {openHomeEvents.length === 0 ? (
              <p className="text-xs text-slate-500">
                No open homes scheduled. Create one to start tracking attendees.
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                {upcomingOpenHomes.length > 0 && (
                  <div>
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                      Upcoming
                    </p>
                    <ul className="space-y-1.5">
                      {upcomingOpenHomes.map((e) => (
                        <li key={e.id} className="flex justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/open-homes/${e.id}`}
                              className="block truncate font-medium text-slate-900 hover:underline"
                            >
                              {e.title || "Open home"}
                            </Link>
                            <p className="truncate text-xs text-slate-500">
                              {formatOpenHomePropertyLabel(e)}
                            </p>
                          </div>
                          <span className="shrink-0 text-[11px] text-slate-600">
                            {formatDateTimeShort(e.start_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {pastOpenHomes.length > 0 && (
                  <div>
                    <p className="mt-2 mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      Recent past
                    </p>
                    <ul className="space-y-1.5">
                      {pastOpenHomes.map((e) => (
                        <li key={e.id} className="flex justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/open-homes/${e.id}`}
                              className="block truncate font-medium text-slate-900 hover:underline"
                            >
                              {e.title || "Open home"}
                            </Link>
                            <p className="truncate text-xs text-slate-500">
                              {formatOpenHomePropertyLabel(e)}
                            </p>
                          </div>
                          <span className="shrink-0 text-[11px] text-slate-600">
                            {formatDateTimeShort(e.start_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent appraisals */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Recent appraisals
              </h2>
              <Link
                href="/appraisals"
                className="text-[11px] font-medium text-slate-600 hover:underline"
              >
                View all
              </Link>
            </div>

            {recentAppraisals.length === 0 ? (
              <p className="text-xs text-slate-500">
                No appraisals yet. Start a new one from the Appraisals page.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentAppraisals.map((a) => (
                  <li key={a.id} className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/appraisals/${a.id}/edit`}
                        className="truncate font-medium text-slate-900 hover:underline"
                      >
                        {a.title}
                      </Link>
                      <div className="truncate text-xs text-slate-500">
                        {a.streetAddress}
                        {a.suburb ? `, ${a.suburb}` : ""}
                      </div>
                    </div>
                    <div className="ml-2 flex flex-col items-end gap-1 text-[11px]">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium uppercase tracking-wide text-slate-600">
                        {a.status || "DRAFT"}
                      </span>
                      <span className="text-slate-500">
                        {formatCreated(a.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent contacts */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Recent contacts
              </h2>
              <Link
                href="/contacts"
                className="text-[11px] font-medium text-slate-600 hover:underline"
              >
                View all
              </Link>
            </div>

            {recentContacts.length === 0 ? (
              <p className="text-xs text-slate-500">
                No contacts yet. Add your first from the Contacts page.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentContacts.map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/contacts/${c.id}`}
                        className="truncate font-medium text-slate-900 hover:underline"
                      >
                        {c.displayName}
                      </Link>
                      <div className="truncate text-xs text-slate-500">
                        {c.email || c.phone || "No contact details yet"}
                      </div>
                    </div>
                    <span className="ml-2 shrink-0 text-[11px] text-slate-500">
                      {formatCreated(c.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
