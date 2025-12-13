// app/(app)/open-homes/[eventId]/OpenHomeAttendeesClient.tsx
"use client";

import React, { useState } from "react";
import { format } from "date-fns";

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
  contact_id: number | null;
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
  const [convertingId, setConvertingId] = useState<string | null>(null);

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
      { method: "DELETE" }
    );

    if (!res.ok && res.status !== 204) {
      console.error("Failed to delete attendee", await res.text());
      alert("Something went wrong deleting the attendee.");
      return;
    }

    setAttendees((prev) => prev.filter((a) => a.id !== attendee.id));

    if (editingId === attendee.id) cancelEdit();
  };

  const convertToContact = async (attendee: Attendee) => {
    if (attendee.contact_id) {
      alert("This attendee is already linked to a contact.");
      return;
    }

    setConvertingId(attendee.id);

    try {
      const res = await fetch(
        `/api/open-homes/${eventId}/attendees/${attendee.id}/convert-to-contact`,
        { method: "POST" }
      );

      if (!res.ok) {
        console.error(
          "Failed to convert attendee to contact",
          await res.text()
        );
        alert("Something went wrong converting this attendee to a contact.");
        return;
      }

      const data = (await res.json()) as {
        contactId?: number;
        alreadyLinked?: boolean;
        success?: boolean;
      };

      if (data.alreadyLinked) {
        alert("This attendee is already linked to a contact.");
        return;
      }

      if (data.contactId) {
        setAttendees((prev) =>
          prev.map((a) =>
            a.id === attendee.id ? { ...a, contact_id: data.contactId! } : a
          )
        );
        alert("Contact created and linked to this attendee.");
      }
    } finally {
      setConvertingId(null);
    }
  };

  const roleLabel = (a: Attendee) => {
    if (a.is_buyer && a.is_seller) return "Buyer & seller";
    if (a.is_buyer) return "Buyer";
    if (a.is_seller) return "Seller";
    return "Other";
  };

  const total = attendees.length;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">Attendees</h2>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>Total: {total}</span>
          {total > 0 && (
            <a
              href={`/api/open-homes/${eventId}/export/csv`}
              className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1 font-medium text-slate-700 hover:bg-slate-50"
            >
              Export CSV
            </a>
          )}
        </div>
      </div>

      {/* Table card */}
      {attendees.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-500 shadow-sm">
          No attendees recorded yet for this open home.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm overflow-hidden">
          <div className="-mx-3 w-full overflow-x-auto">
            <div className="min-w-max px-3">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">
                      Contact
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">
                      Role
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">
                      Lead source
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">
                      Research?
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">
                      Mailing list
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-slate-500">
                      Checked in
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {attendees.map((a) => {
                    const created = new Date(a.created_at);

                    const lead =
                      a.lead_source === "Other" && a.lead_source_other
                        ? `Other (${a.lead_source_other})`
                        : a.lead_source || "-";

                    const isConverting = convertingId === a.id;
                    const isEditingRow = editingId === a.id;

                    return (
                      <React.Fragment key={a.id}>
                        {/* main row */}
                        <tr className="border-b border-slate-100 align-top">
                          <td className="whitespace-nowrap px-3 py-2 text-slate-900">
                            {a.first_name} {a.last_name}
                          </td>

                          <td className="px-3 py-2 text-slate-700">
                            <div className="space-y-0.5">
                              {a.phone && <div>{a.phone}</div>}
                              {a.email && (
                                <div className="text-xs text-slate-500">
                                  {a.email}
                                </div>
                              )}
                              {!a.phone && !a.email && (
                                <div className="text-xs text-slate-400">
                                  No contact details
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                            {roleLabel(a)}
                          </td>

                          <td className="px-3 py-2 text-slate-700">{lead}</td>

                          <td className="px-3 py-2 text-slate-700">
                            {a.research_visit ? "Yes" : "No"}
                          </td>

                          <td className="px-3 py-2 text-slate-700">
                            {a.mailing_list_opt_in ? "Yes" : "No"}
                          </td>

                          <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                            {format(created, "d MMM yyyy, h:mm a")}
                          </td>

                          <td className="whitespace-nowrap px-3 py-2 text-xs">
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  isEditingRow ? cancelEdit() : startEdit(a)
                                }
                                className="text-blue-600 hover:underline"
                              >
                                {isEditingRow ? "Close" : "View / edit"}
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteAttendee(a)}
                                className="text-red-600 hover:underline"
                              >
                                Delete
                              </button>

                              <button
                                type="button"
                                onClick={() => convertToContact(a)}
                                disabled={!!a.contact_id || isConverting}
                                className={
                                  a.contact_id
                                    ? "cursor-not-allowed text-slate-400"
                                    : "text-emerald-600 hover:underline"
                                }
                              >
                                {a.contact_id
                                  ? "Linked to contact"
                                  : isConverting
                                  ? "Converting…"
                                  : "Convert to contact"}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* inline edit row */}
                        {isEditingRow && (
                          <tr className="border-b border-slate-100">
                            <td colSpan={8} className="bg-slate-50 px-3 py-3">
                              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Edit attendee
                                    </p>
                                    <p className="text-sm font-medium text-slate-900">
                                      {a.first_name} {a.last_name}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="text-xs text-slate-500 hover:text-slate-800"
                                  >
                                    Close
                                  </button>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-700">
                                      Mobile
                                    </label>
                                    <input
                                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                                      value={editPhone}
                                      onChange={(e) =>
                                        setEditPhone(e.target.value)
                                      }
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-slate-700">
                                      Email
                                    </label>
                                    <input
                                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                                      value={editEmail}
                                      onChange={(e) =>
                                        setEditEmail(e.target.value)
                                      }
                                    />
                                  </div>
                                </div>

                                <div className="mt-3">
                                  <label className="block text-xs font-medium text-slate-700">
                                    Notes
                                  </label>
                                  <textarea
                                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                                    rows={3}
                                    value={editNotes}
                                    onChange={(e) =>
                                      setEditNotes(e.target.value)
                                    }
                                  />
                                </div>

                                <div className="mt-3 flex flex-wrap justify-end gap-2 text-xs">
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="rounded border border-slate-300 px-3 py-1.5 text-slate-700"
                                  >
                                    Cancel
                                  </button>

                                  <button
                                    type="button"
                                    onClick={saveEdit}
                                    disabled={saving}
                                    className="rounded bg-slate-900 px-3 py-1.5 font-semibold text-white disabled:opacity-60"
                                  >
                                    {saving ? "Saving…" : "Save changes"}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
