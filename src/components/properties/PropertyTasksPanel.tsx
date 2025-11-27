// src/components/properties/PropertyTasksPanel.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { InlineTaskForm } from "@/components/tasks/InlineTaskForm";

type Props = {
  propertyId: number;
};

type TaskRow = {
  id: number;
  title: string | null;
  status: string | null;
  notes: string | null;
  due_date: string | null;
  related_property_id: number | null;
  created_at: string | null;
  priority?: string | null;
  task_type?: string | null;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "No due date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No due date";
  return d.toLocaleDateString("en-AU");
};

export function PropertyTasksPanel({ propertyId }: Props) {
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks?propertyId=${propertyId}`, {
        method: "GET",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Failed to load tasks via API:", res.status, txt);
        setError("Could not load tasks.");
        setRows([]);
        return;
      }

      const json = await res.json();
      console.log("🟢 Tasks for property", propertyId, json);

      const items: TaskRow[] = Array.isArray(json.items) ? json.items : [];
      setRows(items);
    } catch (err) {
      console.error("Unexpected error loading tasks", err);
      setError("Could not load tasks.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const handleComplete = async (taskId: number) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Failed to complete task:", res.status, txt);
        return;
      }

      void loadTasks();
    } catch (err) {
      console.error("Unexpected complete error", err);
    }
  };

  const handleDelete = async (taskId: number) => {
    const confirmed = window.confirm("Delete this task? This can’t be undone.");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Failed to delete task:", res.status, txt);
        return;
      }

      void loadTasks();
    } catch (err) {
      console.error("Unexpected delete error", err);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Tasks
        </h3>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-700"
        >
          + New task
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          <InlineTaskForm
            propertyId={propertyId}
            onCreated={() => {
              setShowForm(false);
              void loadTasks();
            }}
          />
        </div>
      )}

      {loading && <p className="text-xs text-slate-500">Loading tasks…</p>}

      {error && !loading && <p className="text-xs text-red-600">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="text-xs text-slate-500">
          No tasks linked to this property yet.
        </p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-slate-200 p-3 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      {t.task_type && (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          {t.task_type.replace("_", " ")}
                        </span>
                      )}
                      <span className="truncate font-semibold text-slate-900">
                        {t.title || "Task"}
                      </span>
                    </div>
                    {t.priority && t.priority !== "normal" && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                          t.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.priority}
                      </span>
                    )}
                  </div>
                  {t.notes && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">
                      {t.notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-[11px] text-slate-500">
                    {formatDate(t.due_date)}
                  </span>
                  {t.status && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-700">
                      {t.status}
                    </span>
                  )}

                  <div className="mt-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleComplete(t.id)}
                      className="rounded-full border border-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      ✓ Complete
                    </button>

                    <Link
                      href={`/tasks/${t.id}/edit`}
                      className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="rounded-full border border-red-500 px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
