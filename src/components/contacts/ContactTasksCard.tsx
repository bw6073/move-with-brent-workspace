// src/components/contacts/ContactTasksCard.tsx
"use client";

import React, { useEffect, useState } from "react";

export type ContactTask = {
  id: number;
  title: string;
  due_date: string | null;
  priority: string; // "low" | "normal" | "high"
  status: string; // "pending" | "completed" | "cancelled"
  notes: string | null;
  task_type: string | null; // we'll store this in the shared tasks table
  related_contact_id: number | null;
  related_property_id: number | null;
  created_at: string | null;
  updated_at?: string | null;
};

type Props = {
  contactId: number;
};

export function ContactTasksCard({ contactId }: Props) {
  const [items, setItems] = useState<ContactTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [taskType, setTaskType] = useState<string>("call");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<string>("");
  const [priority, setPriority] = useState<string>("normal");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // load tasks for this contact from /api/tasks
  useEffect(() => {
    if (!contactId) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // use unified tasks endpoint, filtered by contactId
        const res = await fetch(`/api/tasks?contactId=${contactId}`);

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("Failed to load contact tasks:", text);
          if (!cancelled) {
            setError("Could not load tasks.");
            setLoading(false);
          }
          return;
        }

        const json = await res.json().catch(() => null);
        const list: ContactTask[] = Array.isArray(json?.items)
          ? json.items
          : [];

        if (!cancelled) {
          setItems(list);
          setLoading(false);
        }
      } catch (err) {
        console.error("Unexpected error loading contact tasks:", err);
        if (!cancelled) {
          setError("Could not load tasks.");
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [contactId]);

  const resetForm = () => {
    setTaskType("call");
    setTitle("");
    setDueDate("");
    setPriority("normal");
    setNotes("");
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!title.trim()) {
      alert("Please add a task title.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        title: title.trim(),
        notes: notes.trim() || null,
        status: "pending",
        due_date: dueDate || null, // keep simple "YYYY-MM-DD" like property tasks
        priority,
        task_type: taskType,
        related_contact_id: contactId,
        related_property_id: null,
      };

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Failed to create contact task:", text);
        setError("Could not save task.");
        return;
      }

      const json = await res.json().catch(() => null);
      const newTask: ContactTask | null = json?.task ?? null;
      if (newTask) {
        setItems((prev) => [newTask, ...prev]);
        resetForm();
      }
    } catch (err) {
      console.error("Unexpected error creating contact task", err);
      setError("Unexpected error while saving task.");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkComplete = async (task: ContactTask) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Failed to mark task complete:", text);
        alert("Could not update task.");
        return;
      }

      const json = await res.json().catch(() => null);
      const updated: ContactTask | null = json?.task ?? null;
      if (updated) {
        setItems((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
      }
    } catch (err) {
      console.error("Unexpected error updating task", err);
      alert("Unexpected error updating task.");
    }
  };

  const handleDelete = async (taskId: number) => {
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Failed to delete task:", text);
        alert("Could not delete task.");
        return;
      }

      setItems((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error("Unexpected error deleting task", err);
      alert("Unexpected error deleting task.");
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "No due date";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "No due date";
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const priorityBadge = (p: string) => {
    if (p === "high") return "bg-red-100 text-red-700";
    if (p === "low") return "bg-slate-100 text-slate-600";
    return "bg-amber-100 text-amber-700";
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>
          <p className="text-xs text-slate-500">
            Follow-ups, calls, emails and reminders for this contact.
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-2 text-xs text-red-600">
          {error} (you can still add new tasks below)
        </p>
      )}
      {loading && !error && (
        <p className="mb-2 text-xs text-slate-500">Loading tasks…</p>
      )}

      {/* Add task form */}
      <form onSubmit={handleAdd} className="mb-4 space-y-2 text-xs">
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-500">Type:</span>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px]"
            >
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="follow_up">Follow-up</option>
              <option value="inspection">Inspection</option>
              <option value="general">General</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-500">Priority:</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px]"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-500">Due:</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-full border border-slate-300 px-2 py-1 text-[11px]"
            />
          </div>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title (eg. Call owner to confirm pricing)…"
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
        />

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes / context for this task (optional)…"
          className="min-h-[60px] w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Add task"}
          </button>
        </div>
      </form>

      {/* Task list */}
      {!loading && items.length === 0 && !error && (
        <p className="text-xs text-slate-500">No tasks yet for this contact.</p>
      )}

      {!loading && items.length > 0 && (
        <ul className="space-y-2 text-xs">
          {items.map((t) => (
            <li
              key={t.id}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {t.task_type && (
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      {t.task_type.replace("_", " ")}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${priorityBadge(
                      t.priority
                    )}`}
                  >
                    {t.priority}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {formatDate(t.due_date)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">
                    {t.status}
                  </span>
                  {t.status !== "completed" && (
                    <button
                      type="button"
                      onClick={() => void handleMarkComplete(t)}
                      className="rounded-full border border-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 hover:bg-emerald-50"
                    >
                      Mark done
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDelete(t.id)}
                    className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="font-medium text-slate-900">{t.title}</div>

              {t.notes && (
                <div className="mt-0.5 text-[11px] text-slate-700">
                  {t.notes}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
