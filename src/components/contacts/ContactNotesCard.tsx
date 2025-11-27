"use client";

import React, { useEffect, useState } from "react";

type ContactNote = {
  id: number;
  contact_id: number;
  note: string;
  created_at: string | null;
  updated_at: string | null;
};

type Props = {
  contactId: number;
};

export function ContactNotesCard({ contactId }: Props) {
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Load notes when contactId changes
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/contacts/${contactId}/notes`);

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("Failed to load contact notes:", text);
          if (!cancelled) {
            setError("Could not load notes.");
            setLoading(false);
          }
          return;
        }

        const json = await res.json().catch(() => null);
        const list: ContactNote[] = json?.notes ?? [];

        if (!cancelled) {
          setNotes(list);
          setLoading(false);
        }
      } catch (err) {
        console.error("Unexpected error loading contact notes:", err);
        if (!cancelled) {
          setError("Could not load notes.");
          setLoading(false);
        }
      }
    };

    if (contactId) {
      void load();
    }

    return () => {
      cancelled = true;
    };
  }, [contactId]);

  const handleAdd = async () => {
    if (saving) return;
    if (!newNote.trim()) return;

    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`/api/contacts/${contactId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote.trim() }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Failed to create note:", text);
        setError("Failed to save note.");
        return;
      }

      const json = await res.json().catch(() => null);
      const created: ContactNote | undefined = json?.note;

      if (created) {
        // Prepend newly created note
        setNotes((prev) => [created, ...prev]);
        setNewNote("");
      }
    } catch (err) {
      console.error("Unexpected error creating note:", err);
      setError("Failed to save note.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: number) => {
    const ok = window.confirm("Delete this note? This cannot be undone.");
    if (!ok) return;

    try {
      const res = await fetch(`/api/contact-notes/${noteId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Failed to delete note:", text);
        setError("Failed to delete note.");
        return;
      }

      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error("Unexpected error deleting note:", err);
      setError("Failed to delete note.");
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Notes</h2>
          <p className="text-xs text-slate-500">
            Quick notes and history for this contact.
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-3 text-xs text-red-600">
          {error} Try refreshing the page.
        </p>
      )}

      {/* Add note */}
      <div className="mb-3 space-y-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note about this contact…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          rows={3}
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !newNote.trim()}
            className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Add note"}
          </button>
        </div>
      </div>

      {/* Notes list */}
      {loading && <p className="text-xs text-slate-500">Loading notes…</p>}

      {!loading && notes.length === 0 && (
        <p className="text-xs text-slate-500">
          No notes yet. Use the box above to add your first note.
        </p>
      )}

      {!loading && notes.length > 0 && (
        <ul className="mt-2 space-y-2 text-xs">
          {notes.map((n) => {
            const created = n.created_at
              ? new Date(n.created_at).toLocaleString()
              : "—";

            return (
              <li
                key={n.id}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">
                    {created}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(n.id)}
                    className="text-[10px] text-slate-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-[12px] text-slate-800">
                  {n.note}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
