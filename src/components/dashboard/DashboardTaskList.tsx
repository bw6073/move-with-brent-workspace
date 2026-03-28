"use client";
// src/components/dashboard/DashboardTaskList.tsx

import React, { useState } from "react";
import Link from "next/link";

type Task = {
  id: number;
  title: string;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  related_contact_id: number | null;
  related_property_id: number | null;
};

type Props = {
  tasks: Task[];
};

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

function formatDate(iso: string | null): string {
  if (!iso) return "No due date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No due date";
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function LinkPill({ task }: { task: Task }) {
  if (task.related_contact_id) {
    return (
      <Link
        href={`/contacts/${task.related_contact_id}`}
        className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
      >
        Contact #{task.related_contact_id}
      </Link>
    );
  }
  if (task.related_property_id) {
    return (
      <Link
        href={`/properties/${task.related_property_id}`}
        className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
      >
        Property #{task.related_property_id}
      </Link>
    );
  }
  return (
    <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-400">
      Not linked
    </span>
  );
}

export function DashboardTaskList({ tasks: initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [completing, setCompleting] = useState<number | null>(null);

  const markDone = async (taskId: number) => {
    setCompleting(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) {
        // Fade it out of the list after a short delay
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: "completed" } : t))
        );
        setTimeout(() => {
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
        }, 600);
      }
    } finally {
      setCompleting(null);
    }
  };

  if (tasks.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        No open tasks. Create one from a contact, property or the Tasks page.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 text-sm">
      {tasks.map((t) => {
        const overdue = isOverdue(t.due_date);
        const done = t.status === "completed";

        return (
          <li
            key={t.id}
            className={`flex items-start justify-between gap-3 py-2 transition-opacity duration-500 ${done ? "opacity-30" : ""}`}
          >
            {/* Checkbox */}
            <button
              type="button"
              onClick={() => markDone(t.id)}
              disabled={completing === t.id || done}
              title="Mark as done"
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                done
                  ? "border-emerald-400 bg-emerald-400"
                  : "border-slate-300 hover:border-slate-500"
              }`}
            >
              {(completing === t.id || done) && (
                <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="truncate font-medium text-slate-900">
                <Link href={`/tasks/${t.id}/edit`} className="hover:underline">
                  {t.title}
                </Link>
                {t.priority === "high" && (
                  <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-600">
                    High
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500">
                <LinkPill task={t} />
              </div>
            </div>

            <div className="ml-2 shrink-0 text-right">
              <span className={`text-[11px] ${overdue ? "font-medium text-red-600" : "text-slate-500"}`}>
                {overdue ? "Overdue · " : ""}{formatDate(t.due_date)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
