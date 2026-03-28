// src/app/(app)/tasks/page.tsx
import React from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";
import { TasksFilterBar } from "./TasksFilterBar";
import { TasksListClient, type RichTask } from "@/components/tasks/TasksListClient";

type TaskRow = {
  id: number;
  title: string | null;
  status: string | null;
  priority: string | null;
  task_type: string | null;
  due_date: string | null;
  related_contact_id: number | null;
  related_property_id: number | null;
  created_at: string | null;
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string }>;
}) {
  const { user, supabase } = await requireUser();
  const filters = await searchParams;

  // 1) Load raw tasks
  let tasksQuery = supabase
    .from("tasks")
    .select(
      `
      id,
      title,
      status,
      priority,
      task_type,
      due_date,
      related_contact_id,
      related_property_id,
      created_at
    `
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("due_date", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .limit(500);

  if (filters.status) tasksQuery = tasksQuery.eq("status", filters.status);
  if (filters.priority) tasksQuery = tasksQuery.eq("priority", filters.priority);

  const { data, error } = await tasksQuery;

  if (error) {
    console.error("[TasksPage] supabase error", error);
  }

  const tasks: TaskRow[] = (data ?? []) as any;

  // 2) Collect unique contact & property IDs
  const contactIds = Array.from(
    new Set(
      tasks
        .map((t) => t.related_contact_id)
        .filter((id): id is number => typeof id === "number")
    )
  );

  const propertyIds = Array.from(
    new Set(
      tasks
        .map((t) => t.related_property_id)
        .filter((id): id is number => typeof id === "number")
    )
  );

  // 3) Fetch those contacts
  const contactMap = new Map<number, string>();
  if (contactIds.length > 0) {
    const { data: contactsData } = await supabase
      .from("contacts")
      .select("id, name, first_name, last_name")
      .eq("user_id", user.id)
      .in("id", contactIds);

    for (const c of contactsData ?? []) {
      const label =
        c.name ||
        [c.first_name, c.last_name].filter(Boolean).join(" ") ||
        `Contact #${c.id}`;
      contactMap.set(c.id, label);
    }
  }

  // 4) Fetch those properties
  const propertyMap = new Map<number, string>();
  if (propertyIds.length > 0) {
    const { data: propertiesData } = await supabase
      .from("properties")
      .select("id, street_address, suburb")
      .eq("user_id", user.id)
      .in("id", propertyIds);

    for (const p of propertiesData ?? []) {
      const label = p.street_address
        ? `${p.street_address}${p.suburb ? `, ${p.suburb}` : ""}`
        : `Property #${p.id}`;
      propertyMap.set(p.id, label);
    }
  }

  // Simple stats
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let openCount = 0;
  let overdueCount = 0;
  let todayCount = 0;
  let upcomingCount = 0;
  let noDueCount = 0;

  for (const t of tasks) {
    if (t.status === "completed") continue;
    openCount++;

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

  const richTasks: RichTask[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    task_type: t.task_type,
    due_date: t.due_date,
    contactLabel: t.related_contact_id
      ? (contactMap.get(t.related_contact_id) ?? `Contact #${t.related_contact_id}`)
      : null,
    contactId: t.related_contact_id,
    propertyLabel: t.related_property_id
      ? (propertyMap.get(t.related_property_id) ?? `Property #${t.related_property_id}`)
      : null,
    propertyId: t.related_property_id,
  }));

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-600">
            Central list of your tasks across contacts and properties.
          </p>
        </div>

        <Link
          href="/tasks/new"
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          + New task
        </Link>
      </header>

      {/* FILTER BAR */}
      <TasksFilterBar
        currentStatus={filters.status ?? ""}
        currentPriority={filters.priority ?? ""}
      />

      {/* STATS STRIP */}
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

      {/* TASK LIST */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <TasksListClient initialTasks={richTasks} />
      </section>
    </div>
  );
}
