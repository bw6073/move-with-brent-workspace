// src/components/contacts/ContactNotesCard.tsx
"use client";

import React, { useEffect, useState } from "react";

type ContactNote = {
  id: number;
  contact_id: number;
  note: string;
  note_type: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Props = {
  contactId: number;
};

const noteTypeLabel = (t: string | null) => {
  if (!t) return "General";

  switch (t) {
    case "phone":
    case "phone_call":
      return "Phone call";
    case "meeting":
      return "Meeting";
    case "inspection":
      return "Inspection";
    case "email":
      return "Email";
    case "sms":
      return "SMS";
    case "general":
      return "General";
    default:
      return t.charAt(0).toUpperCase() + t.slice(1);
  }
};

const NOTE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "general", label: "General" },
  { value: "phone", label: "Phone call" },
  { value: "meeting", label: "Meeting" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "inspection", label: "Inspection" },
];

export function ContactNotesCard({ contactId }: Props) {
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [newNoteType, setNewNoteType] = useState<string>("general");

  const loadNotes = async () => {
    if (!contactId || Number.isNaN(Number(contactId))) {
      console.error("ContactNotesCard: invalid contactId prop", contactId);
      setError("Missing or invalid contact id");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/contacts/${contactId}/notes`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load notes");
      }

      const data = (await res.json()) as { notes: ContactNote[] };
      setNotes(data.notes || []);
    } catch (err: any) {
      console.error("Error loading contact notes", err);
      setError(err.message || "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = newNote.trim();
    if (!value) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/contacts/${contactId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          note: value,
          note_type: newNoteType || "general",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save note");
      }

      const data = (await res.json()) as { note: ContactNote };
      setNotes((prev) => [data.note, ...prev]);
      setNewNote("");
      setNewNoteType("general");
    } catch (err: any) {
      console.error("Error saving contact note", err);
      setError(err.message || "Failed to save note");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this note?")) return;

    try {
      const res = await fetch(`/api/contact-notes/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete note");
      }

      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err: any) {
      console.error("Error deleting contact note", err);
      setError(err.message || "Failed to delete note");
    }
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5 space-y-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-base md:text-lg font-semibold text-slate-900">
          Notes
        </h2>
      </header>

      <form onSubmit={handleAddNote} className="space-y-2">
        {/* Note type selector */}
        <div className="flex flex-wrap gap-1.5">
          {NOTE_TYPE_OPTIONS.map((opt) => {
            const isActive = newNoteType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setNewNoteType(opt.value)}
                className={[
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  isActive
                    ? "border-amber-500 bg-amber-50 text-amber-800"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <textarea
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          rows={3}
          placeholder="Add a quick note about this contact…"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
        />
        <div className="flex items-center justify-between">
          {error && (
            <p className="text-xs text-red-600 truncate max-w-xs">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting || !newNote.trim()}
            className="inline-flex items-center rounded-xl border border-transparent bg-emerald-600 px-3 py-1.5 text-xs md:text-sm font-medium text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colours"
          >
            {submitting ? "Saving…" : "Add note"}
          </button>
        </div>
      </form>

      <div className="border-t border-slate-200 pt-3 space-y-2 max-h-80 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-slate-500">Loading notes…</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-slate-500">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <article
              key={note.id}
              className="group rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm flex flex-col gap-1"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {noteTypeLabel(note.note_type)}
                </span>
                <span className="text-[11px] text-slate-500">
                  {formatDateTime(note.created_at ?? note.updated_at)}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDelete(note.id)}
                  className="ml-auto text-xs text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Delete
                </button>
              </div>

              <p className="whitespace-pre-wrap text-slate-800 text-[13px]">
                {note.note}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
