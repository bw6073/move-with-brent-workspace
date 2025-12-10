// src/app/tasks/page.tsx
import React from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";

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

export default async function TasksPage() {
  const { user, supabase } = await requireUser();

  // 1) Load raw tasks
  const { data, error } = await supabase
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
    .order("due_date", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

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

  const typeBadge = (type: string | null) => {
    if (!type) return null;
    const label = type.replace("_", " ");
    return (
      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        {label}
      </span>
    );
  };

  const priorityBadge = (priority: string | null) => {
    if (!priority || priority === "normal") return null;
    const cls =
      priority === "high"
        ? "bg-red-100 text-red-700"
        : "bg-slate-100 text-slate-700";

    return (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}
      >
        {priority}
      </span>
    );
  };

  const linkPill = (t: TaskRow) => {
    if (t.related_contact_id) {
      const label =
        contactMap.get(t.related_contact_id) ||
        `Contact #${t.related_contact_id}`;

      return (
        <Link
          href={`/contacts/${t.related_contact_id}`}
          className="max-w-[200px] truncate rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
        >
          👤 {label}
        </Link>
      );
    }

    if (t.related_property_id) {
      const label =
        propertyMap.get(t.related_property_id) ||
        `Property #${t.related_property_id}`;

      return (
        <Link
          href={`/properties/${t.related_property_id}`}
          className="max-w-[230px] truncate rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
        >
          🏡 {label}
        </Link>
      );
    }

    return (
      <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-400">
        Not linked
      </span>
    );
  };

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
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-500">
            No tasks yet. Create one from a contact, a property or the button
            above.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {tasks.map((t) => {
              const isCompleted = t.status === "completed";
              const isOverdue =
                !isCompleted &&
                t.due_date &&
                new Date(t.due_date).getTime() <
                  new Date().setHours(0, 0, 0, 0);

              return (
                <li
                  key={t.id}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {typeBadge(t.task_type)}
                      {priorityBadge(t.priority)}
                      <Link
                        href={`/tasks/${t.id}/edit`}
                        className="truncate font-medium text-slate-900 hover:underline"
                      >
                        {t.title || "Untitled task"}
                      </Link>
                    </div>
                    <div className="text-xs text-slate-500">
                      Due:{" "}
                      <span className={isOverdue ? "text-red-600" : ""}>
                        {t.due_date ? formatDate(t.due_date) : "No due date"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {t.status || "pending"}
                    </span>
                    {linkPill(t)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
