"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toastError } from "@/lib/toast";

export type RichTask = {
  id: number;
  title: string | null;
  status: string | null;
  priority: string | null;
  task_type: string | null;
  due_date: string | null;
  contactLabel: string | null;
  contactId: number | null;
  propertyLabel: string | null;
  propertyId: number | null;
};

type Props = {
  initialTasks: RichTask[];
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

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  return (
    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
      {type.replace(/_/g, " ")}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority || priority === "normal") return null;
  const cls = priority === "high" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}>
      {priority}
    </span>
  );
}

function LinkPill({ task }: { task: RichTask }) {
  if (task.contactId && task.contactLabel) {
    return (
      <Link
        href={`/contacts/${task.contactId}`}
        className="max-w-[200px] truncate rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
      >
        👤 {task.contactLabel}
      </Link>
    );
  }
  if (task.propertyId && task.propertyLabel) {
    return (
      <Link
        href={`/properties/${task.propertyId}`}
        className="max-w-[230px] truncate rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
      >
        🏡 {task.propertyLabel}
      </Link>
    );
  }
  return (
    <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-400">
      Not linked
    </span>
  );
}

export function TasksListClient({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<RichTask[]>(initialTasks);
  const [completing, setCompleting] = useState<number | null>(null);

  const toggleComplete = async (task: RichTask) => {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    setCompleting(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
        );
      } else {
        toastError("Failed to update task.");
      }
    } finally {
      setCompleting(null);
    }
  };

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No tasks yet. Create one from a contact, a property or the button above.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 text-sm">
      {tasks.map((t) => {
        const isCompleted = t.status === "completed";
        const isOverdue =
          !isCompleted &&
          t.due_date &&
          new Date(t.due_date).getTime() < new Date().setHours(0, 0, 0, 0);

        return (
          <li
            key={t.id}
            className={`flex items-start gap-3 py-3 transition-opacity duration-500 ${isCompleted ? "opacity-40" : ""}`}
          >
            {/* Checkbox */}
            <button
              type="button"
              onClick={() => toggleComplete(t)}
              disabled={completing === t.id}
              title={isCompleted ? "Mark as pending" : "Mark as done"}
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                isCompleted
                  ? "border-emerald-400 bg-emerald-400"
                  : "border-slate-300 hover:border-slate-500"
              }`}
            >
              {(completing === t.id || isCompleted) && (
                <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={t.task_type} />
                <PriorityBadge priority={t.priority} />
                <Link
                  href={`/tasks/${t.id}/edit`}
                  className="truncate font-medium text-slate-900 hover:underline"
                >
                  {t.title || "Untitled task"}
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>
                  Due:{" "}
                  <span className={isOverdue ? "text-red-600" : ""}>
                    {formatDate(t.due_date)}
                  </span>
                </span>
                <LinkPill task={t} />
              </div>
            </div>

            <div className="shrink-0">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                  isCompleted
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {t.status || "pending"}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
