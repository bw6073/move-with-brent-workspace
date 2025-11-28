"use client";

import React, { useEffect, useState } from "react";

type ContactTask = {
  id: number;
  related_contact_id: number | null;
  related_property_id: number | null;
  task_type: string | null;
  title: string | null;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Props = {
  contactId: number;
};

const formatDateTime = (iso: string | null) => {
  if (!iso) return "No date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No date";

  const date = d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const time = d.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${date} ${time}`;
};

const formatDateOnly = (iso: string | null) => {
  if (!iso) return "No due date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No due date";
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const typeLabel = (t: string | null | undefined) =>
  (t ?? "task").replace(/_/g, " ");

const statusBadgeClass = (status: string | null) => {
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "cancelled") return "bg-slate-100 text-slate-500";
  return "bg-slate-100 text-slate-700";
};

const priorityBadgeClass = (priority: string | null) => {
  if (priority === "high") return "bg-red-100 text-red-700";
  if (priority === "low") return "bg-slate-100 text-slate-600";
  return "bg-amber-100 text-amber-700";
};

function ContactTimelineCard({ contactId }: Props) {
  const [tasks, setTasks] = useState<ContactTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contactId) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🔑 use the dynamic route: /api/contacts/[id]/tasks
        const res = await fetch(`/api/contacts/${contactId}/tasks`);

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("Failed to load contact tasks for timeline:", txt);
          if (!cancelled) {
            setError("Could not load timeline activity.");
            setLoading(false);
          }
          return;
        }

        const json = await res.json().catch(() => null);
        console.log("🟢 Timeline tasks JSON for contact", contactId, json);

        let list: ContactTask[] = [];

        if (Array.isArray(json)) {
          list = json as ContactTask[];
        } else if (json && Array.isArray(json.tasks)) {
          list = json.tasks as ContactTask[];
        } else if (json && Array.isArray(json.items)) {
          list = json.items as ContactTask[];
        } else {
          list = [];
        }

        // newest first
        list.sort((a, b) => {
          const aDate = a.created_at || a.due_date || "";
          const bDate = b.created_at || b.due_date || "";
          return (bDate || "").localeCompare(aDate || "");
        });

        if (!cancelled) {
          setTasks(list);
          setLoading(false);
        }
      } catch (err) {
        console.error("Unexpected error loading contact timeline tasks:", err);
        if (!cancelled) {
          setError("Could not load timeline activity.");
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [contactId]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Timeline</h2>
          <p className="text-xs text-slate-500">
            Activity for this contact (tasks shown in chronological order).
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600">
          {error} (you can still use the Tasks tab to view and manage tasks.)
        </p>
      )}

      {loading && !error && (
        <p className="text-xs text-slate-500">Loading activity…</p>
      )}

      {!loading && !error && tasks.length === 0 && (
        <p className="text-xs text-slate-500">
          No activity yet. Create a task from the Tasks tab to start the
          timeline.
        </p>
      )}

      {!loading && !error && tasks.length > 0 && (
        <ol className="relative mt-2 space-y-3 border-l border-slate-200 pl-3 text-xs">
          {tasks.map((task) => {
            const isCompleted = task.status === "completed";

            return (
              <li key={task.id} className="relative pl-2">
                {/* Dot */}
                <span className="absolute -left-[9px] mt-1.5 h-2.5 w-2.5 rounded-full border border-slate-300 bg-white" />

                <div className="flex flex-col gap-1 rounded-md bg-slate-50/60 p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      {typeLabel(task.task_type)}
                    </span>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusBadgeClass(
                        task.status
                      )}`}
                    >
                      {task.status}
                    </span>

                    {task.priority && task.priority !== "normal" && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${priorityBadgeClass(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    )}

                    <span className="ml-auto text-[10px] text-slate-500">
                      {task.created_at
                        ? formatDateTime(task.created_at)
                        : task.due_date
                        ? `Due ${formatDateOnly(task.due_date)}`
                        : "No date"}
                    </span>
                  </div>

                  <div
                    className={`text-[13px] font-medium ${
                      isCompleted
                        ? "text-slate-700 line-through"
                        : "text-slate-900"
                    }`}
                  >
                    {task.title}
                  </div>

                  {task.notes && (
                    <div className="text-[11px] text-slate-600">
                      {task.notes}
                    </div>
                  )}

                  {task.due_date && (
                    <div className="text-[10px] text-slate-500">
                      Due: {formatDateOnly(task.due_date)}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// 👇 named export to match your import
export { ContactTimelineCard };
