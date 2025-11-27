"use client";

import React, { useState } from "react";

type InlineTaskFormProps = {
  propertyId: number;
  onCreated?: () => void;
};

type Priority = "low" | "normal" | "high";

export function InlineTaskForm({ propertyId, onCreated }: InlineTaskFormProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(""); // YYYY-MM-DD
  const [priority, setPriority] = useState<Priority>("normal");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!title.trim()) {
      setError("Please enter a task title.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        status: "pending",
        related_property_id: propertyId,
        notes: notes.trim() || null,
        priority,
        due_date: dueDate || null, // backend can store as date
      };

      console.log("INLINE TASK PAYLOAD:", payload);

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Inline task create failed:", res.status, txt);
        setError("Could not create task.");
        setSaving(false);
        return;
      }

      // clear form
      setTitle("");
      setDueDate("");
      setPriority("normal");
      setNotes("");

      if (onCreated) onCreated();
    } catch (err) {
      console.error("Unexpected inline task error:", err);
      setError("Unexpected error while creating the task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 text-xs">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <input
            type="text"
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            placeholder="Task title (e.g. Call owner to confirm access)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="w-32">
          <input
            type="date"
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="w-28">
          <select
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <textarea
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
        rows={2}
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="flex items-center justify-between pt-1">
        <p className="text-[11px] text-slate-500">
          Linked to this property automatically.
        </p>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Add task"}
        </button>
      </div>
    </form>
  );
}
