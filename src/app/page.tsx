// src/app/page.tsx
import React from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";

type HomeTaskRow = {
  id: number;
  title: string;
  status: string | null;
  priority: string | null;
  due_date: string | null;
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

export default async function HomePage() {
  const { user, supabase } = await requireUser();

  // ───────────────── TASKS SNAPSHOT (from `tasks`) ─────────────────
  const { data: taskData } = await supabase
    .from("tasks")
    .select("id, title, status, priority, due_date, user_id")
    // include rows where user_id is null (old data) or matches you
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .in("status", ["pending", "in_progress"])
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(20);

  const tasks: HomeTaskRow[] = (taskData ?? []).map((row: any) => ({
    id: row.id,
    title: row.title ?? "Untitled task",
    status: row.status ?? "pending",
    priority: row.priority ?? "normal",
    due_date: row.due_date ?? null,
  }));

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let openCount = tasks.length;
  let overdueCount = 0;
  let todayCount = 0;
  let upcomingCount = 0;
  let noDueCount = 0;

  for (const t of tasks) {
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

  // ───────────────── RECENT APPRAISALS ─────────────────
  const { data: appraisalData } = await supabase
    .from("appraisals")
    .select("*") // safe with any schema
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

  // ───────────────── RECENT CONTACTS ─────────────────
  const { data: contactData } = await supabase
    .from("contacts")
    .select("*") // don’t assume full_name exists
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

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          Move With Brent – Workspace
        </h1>
        <p className="text-slate-600">
          Quick access to your core tools and today&apos;s priorities.
        </p>
      </header>

      {/* QUICK NAV CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* MAIN GRID: TASKS + RECENT ACTIVITY */}
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
                href="/tasks?new=1"
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

          {tasks.length === 0 && (
            <p className="text-xs text-slate-500">
              No tasks yet. Create one from a contact, property or the Tasks
              page.
            </p>
          )}

          {tasks.length > 0 && (
            <ul className="divide-y divide-slate-100 text-sm">
              {tasks.map((t) => {
                const isOverdue =
                  t.due_date &&
                  new Date(t.due_date).getTime() <
                    new Date().setHours(0, 0, 0, 0);

                return (
                  <li key={t.id} className="flex justify-between py-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">
                        {t.title}
                      </div>
                    </div>

                    <div className="ml-3 flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                          t.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.status}
                      </span>
                      <span
                        className={`text-[11px] ${
                          isOverdue ? "text-red-600" : "text-slate-500"
                        }`}
                      >
                        {t.due_date ? formatDate(t.due_date) : "No due date"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* RECENT ACTIVITY */}
        <div className="space-y-4">
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
