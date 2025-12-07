// app/open-homes/[eventId]/OpenHomeAttendeesClient.tsx
"use client";

import { format } from "date-fns";
import { useState } from "react";

export type Attendee = {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  lead_source: string | null;
  lead_source_other: string | null;
  is_buyer: boolean;
  is_seller: boolean;
  research_visit: boolean;
  mailing_list_opt_in: boolean;
  notes: string | null;
};

type Props = {
  eventId: string;
  initialAttendees: Attendee[];
};

export function OpenHomeAttendeesClient({ eventId, initialAttendees }: Props) {
  const [attendees, setAttendees] = useState<Attendee[]>(initialAttendees);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = (attendee: Attendee) => {
    setEditingId(attendee.id);
    setEditNotes(attendee.notes || "");
    setEditPhone(attendee.phone || "");
    setEditEmail(attendee.email || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNotes("");
    setEditPhone("");
    setEditEmail("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);

    try {
      const res = await fetch(
        `/api/open-homes/${eventId}/attendees/${editingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: editPhone,
            email: editEmail,
            notes: editNotes,
          }),
        }
      );

      if (!res.ok) {
        console.error("Failed to update attendee", await res.text());
        alert("Something went wrong saving attendee changes.");
        return;
      }

      const { attendee } = (await res.json()) as { attendee: Attendee };
      setAttendees((prev) =>
        prev.map((a) => (a.id === attendee.id ? attendee : a))
      );
      cancelEdit();
    } finally {
      setSaving(false);
    }
  };

  const deleteAttendee = async (attendee: Attendee) => {
    const ok = window.confirm(
      `Delete attendee ${attendee.first_name} ${attendee.last_name}?`
    );
    if (!ok) return;

    const res = await fetch(
      `/api/open-homes/${eventId}/attendees/${attendee.id}`,
      {
        method: "DELETE",
      }
    );

    if (!res.ok && res.status !== 204) {
      console.error("Failed to delete attendee", await res.text());
      alert("Something went wrong deleting the attendee.");
      return;
    }

    setAttendees((prev) => prev.filter((a) => a.id !== attendee.id));

    if (editingId === attendee.id) {
      cancelEdit();
    }
  };

  const roleLabel = (a: Attendee) => {
    if (a.is_buyer && a.is_seller) return "Buyer & Seller";
    if (a.is_buyer) return "Buyer";
    if (a.is_seller) return "Seller";
    return "Other";
  };

  const total = attendees.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Attendees</h2>
        <div className="flex items-center gap-3">
          <p className="text-sm text-zinc-500">Total: {total}</p>
          {total > 0 && (
            <a
              href={`/api/open-homes/${eventId}/export/csv`}
              className="inline-flex items-center rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:border-blue-500 hover:text-blue-600"
            >
              Export CSV
            </a>
          )}
        </div>
      </div>

      {attendees.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No attendees recorded yet for this open home.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Contact</th>
                <th className="text-left px-3 py-2">Role</th>
                <th className="text-left px-3 py-2">Lead source</th>
                <th className="text-left px-3 py-2">Research?</th>
                <th className="text-left px-3 py-2">Mailing list</th>
                <th className="text-left px-3 py-2">Checked in</th>
                <th className="text-left px-3 py-2">Notes</th>
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((a) => {
                const created = new Date(a.created_at);

                const lead =
                  a.lead_source === "Other" && a.lead_source_other
                    ? `Other (${a.lead_source_other})`
                    : a.lead_source || "-";

                const isEditing = editingId === a.id;

                return (
                  <tr key={a.id} className="border-b border-zinc-100 align-top">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {a.first_name} {a.last_name}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            className="border rounded px-2 py-1 w-full text-xs"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="Phone"
                          />
                          <input
                            className="border rounded px-2 py-1 w-full text-xs"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            placeholder="Email"
                          />
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {a.phone && <div>{a.phone}</div>}
                          {a.email && (
                            <div className="text-xs text-zinc-500">
                              {a.email}
                            </div>
                          )}
                          {!a.phone && !a.email && (
                            <div className="text-zinc-400 text-xs">
                              No contact details
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {roleLabel(a)}
                    </td>
                    <td className="px-3 py-2">{lead}</td>
                    <td className="px-3 py-2">
                      {a.research_visit ? "Yes" : "No"}
                    </td>
                    <td className="px-3 py-2">
                      {a.mailing_list_opt_in ? "Yes" : "No"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {format(created, "d MMM yyyy, h:mm a")}
                    </td>
                    <td className="px-3 py-2 max-w-xs whitespace-pre-wrap">
                      {isEditing ? (
                        <textarea
                          className="border rounded px-2 py-1 w-full text-xs min-h-[60px]"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                        />
                      ) : (
                        a.notes || "-"
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      {isEditing ? (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={saving}
                            className="rounded bg-blue-600 text-white px-2 py-1 disabled:opacity-60"
                          >
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="text-zinc-600 hover:text-zinc-900"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(a)}
                            className="text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAttendee(a)}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
