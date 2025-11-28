// src/components/tasks/TaskForm.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type TaskFormProps = {
  mode: "create" | "edit";
  taskId?: number;
  initialValues?: {
    title?: string | null;
    notes?: string | null;
    due_date?: string | null; // ISO or date string
    status?: string | null;
    related_property_id?: number | null;
    related_contact_id?: number | null;
    priority?: string | null;
    task_type?: string | null;
  } | null;
  /** Optional property to link this task to */
  propertyId?: number | null;
};

type FormState = {
  title: string;
  notes: string;
  due_date: string; // "YYYY-MM-DD" for <input type="date">
  status: string;
  priority: string;
  task_type: string;
  related_property_id: number | null;
  related_contact_id: number | null;
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
];

export default function TaskForm({
  mode,
  taskId,
  initialValues,
  propertyId,
}: TaskFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(() => {
    const rawDue = initialValues?.due_date ?? "";
    const dueDateValue =
      rawDue && rawDue.length >= 10 ? rawDue.slice(0, 10) : "";

    return {
      title: initialValues?.title ?? "",
      notes: initialValues?.notes ?? "",
      due_date: dueDateValue,
      status: initialValues?.status ?? "pending",
      priority: initialValues?.priority ?? "normal",
      task_type: initialValues?.task_type ?? "general",
      // If this form was opened from a property, override with that ID
      related_property_id:
        typeof propertyId === "number"
          ? propertyId
          : initialValues?.related_property_id ?? null,
      related_contact_id: initialValues?.related_contact_id ?? null,
    };
  });

  const updateField = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const navigateAfterChange = (
    linkedPropertyId: number | null,
    linkedContactId: number | null
  ) => {
    if (linkedPropertyId) {
      router.push(`/properties/${linkedPropertyId}`);
      return;
    }
    if (linkedContactId) {
      router.push(`/contacts/${linkedContactId}`);
      return;
    }
    router.push("/tasks");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);

    try {
      if (!form.title.trim()) {
        setError("Please enter a task title.");
        setSaving(false);
        return;
      }

      const payload: Record<string, any> = {
        title: form.title.trim(),
        notes: form.notes.trim() || null,
        status: form.status,
        priority: form.priority,
        task_type: form.task_type,
        related_property_id: form.related_property_id ?? null,
        related_contact_id: form.related_contact_id ?? null,
        due_date: form.due_date || null, // "YYYY-MM-DD" or null
      };

      const url =
        mode === "edit" && taskId ? `/api/tasks/${taskId}` : "/api/tasks";
      const method = mode === "edit" && taskId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Task save failed:", res.status, res.statusText, txt);
        setError("There was a problem saving the task.");
        setSaving(false);
        return;
      }

      const json = await res.json().catch(() => ({} as any));
      console.log("Task saved:", json);

      navigateAfterChange(form.related_property_id, form.related_contact_id);
    } catch (err) {
      console.error("Unexpected task save error:", err);
      setError("Unexpected error while saving the task.");
      setSaving(false);
    }
  };

  const handleMarkComplete = async () => {
    if (mode !== "edit" || !taskId) return;
    if (form.status === "completed") return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error(
          "Task mark-complete failed:",
          res.status,
          res.statusText,
          txt
        );
        setError("Failed to mark task as completed.");
        setSaving(false);
        return;
      }

      setForm((prev) => ({ ...prev, status: "completed" }));

      navigateAfterChange(form.related_property_id, form.related_contact_id);
    } catch (err) {
      console.error("Unexpected task complete error:", err);
      setError("Unexpected error while marking the task complete.");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (mode !== "edit" || !taskId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this task? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      setDeleteLoading(true);
      setError(null);

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Task delete failed:", res.status, res.statusText, txt);
        setError("Failed to delete task.");
        setDeleteLoading(false);
        return;
      }

      navigateAfterChange(form.related_property_id, form.related_contact_id);
    } catch (err) {
      console.error("Unexpected task delete error:", err);
      setError("Unexpected error while deleting the task.");
      setDeleteLoading(false);
    }
  };

  const renderLinkedTo = () => {
    if (form.related_property_id) {
      return (
        <p className="mt-1 text-xs text-slate-500">
          Linked to{" "}
          <Link
            href={`/properties/${form.related_property_id}`}
            className="font-semibold text-slate-900 underline-offset-2 hover:underline"
          >
            property #{form.related_property_id}
          </Link>
        </p>
      );
    }

    if (form.related_contact_id) {
      return (
        <p className="mt-1 text-xs text-slate-500">
          Linked to{" "}
          <Link
            href={`/contacts/${form.related_contact_id}`}
            className="font-semibold text-slate-900 underline-offset-2 hover:underline"
          >
            contact #{form.related_contact_id}
          </Link>
        </p>
      );
    }

    return (
      <p className="mt-1 text-xs text-slate-400">
        Not currently linked to a contact or property.
      </p>
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-sm"
    >
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          {mode === "create" ? "New task" : "Edit task"}
        </h1>
        {renderLinkedTo()}
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-slate-600">
          Title
        </label>
        <input
          type="text"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="e.g. Call owner to confirm access"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-slate-600">
          Notes
        </label>
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          rows={3}
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Details, context, phone numbers, etc."
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {/* Due date */}
        <div className="sm:col-span-1">
          <label className="block text-xs font-medium text-slate-600">
            Due date
          </label>
          <input
            type="date"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            value={form.due_date}
            onChange={(e) => updateField("due_date", e.target.value)}
          />
        </div>

        {/* Status */}
        <div className="sm:col-span-1">
          <label className="block text-xs font-medium text-slate-600">
            Status
          </label>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            value={form.status}
            onChange={(e) => updateField("status", e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div className="sm:col-span-1">
          <label className="block text-xs font-medium text-slate-600">
            Priority
          </label>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            value={form.priority}
            onChange={(e) => updateField("priority", e.target.value)}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Task Type */}
        <div className="sm:col-span-1">
          <label className="block text-xs font-medium text-slate-600">
            Task type
          </label>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            value={form.task_type}
            onChange={(e) => updateField("task_type", e.target.value)}
          >
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="follow_up">Follow-up</option>
            <option value="inspection">Inspection</option>
            <option value="general">General</option>
          </select>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="mt-4 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save task"}
          </button>

          {mode === "edit" && taskId && (
            <>
              <button
                type="button"
                onClick={handleMarkComplete}
                disabled={saving || form.status === "completed"}
                className="rounded-lg border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
              >
                {form.status === "completed" ? "Completed" : "Mark complete"}
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Tasks linked to a contact or property will appear on that record’s
          panel.
        </p>
      </div>
    </form>
  );
}
