"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";

type OpenHomeEvent = {
  id: string;
  property_id: number;
  title: string | null;
  start_at: string;
  end_at: string | null;
  notes: string | null;
};

type Property = {
  id: number;
  street_address: string;
  suburb: string;
  state: string;
  postcode: string;
};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  // yyyy-MM-ddTHH:mm for datetime-local
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function EditOpenHomeForm({
  event,
  properties,
}: {
  event: OpenHomeEvent;
  properties: Property[];
}) {
  const router = useRouter();

  const [propertyId, setPropertyId] = useState<string>(
    String(event.property_id)
  );
  const [title, setTitle] = useState(event.title || "");
  const [startAt, setStartAt] = useState(toLocalInputValue(event.start_at));
  const [endAt, setEndAt] = useState(toLocalInputValue(event.end_at));
  const [notes, setNotes] = useState(event.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!propertyId) {
      alert("Please select a property.");
      return;
    }
    if (!startAt) {
      alert("Please select a start date and time.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/open-homes/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          title,
          startAt,
          endAt: endAt || null,
          notes,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        console.error("Error updating open home:", json);
        alert("Something went wrong saving changes.");
        return;
      }

      router.push(`/open-homes/${event.id}`);
    } finally {
      setSaving(false);
    }
  };

  const formatPropertyLabel = (p: Property) =>
    `${p.street_address}, ${p.suburb} ${p.state} ${p.postcode}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Property */}
      <div>
        <label className="block text-sm mb-1">Property</label>
        <select
          className="w-full border rounded-lg px-3 py-2"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
        >
          <option value="">Select property…</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {formatPropertyLabel(p)}
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm mb-1">
          Title (optional, e.g. &quot;Saturday 11am Home Open&quot;)
        </label>
        <input
          className="w-full border rounded-lg px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Start / end */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm mb-1">Start</label>
          <input
            type="datetime-local"
            className="w-full border rounded-lg px-3 py-2"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm mb-1">
            End (optional, usually 30–60 mins later)
          </label>
          <input
            type="datetime-local"
            className="w-full border rounded-lg px-3 py-2"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm mb-1">Notes (agent only)</label>
        <textarea
          className="w-full border rounded-lg px-3 py-2 min-h-[80px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Updated time, changed to Sunday, combine with second inspection, etc."
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-blue-600 text-white font-semibold px-5 py-2 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/open-homes/${event.id}`)}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
