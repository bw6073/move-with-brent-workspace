"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";

type Property = {
  id: number;
  street_address: string;
  suburb: string;
  state: string;
  postcode: string;
};

type NewOpenHomeFormProps = {
  properties: Property[];
  initialPropertyId?: number;
};

export function NewOpenHomeForm({
  properties,
  initialPropertyId,
}: NewOpenHomeFormProps) {
  const router = useRouter();

  // Decide initial selected property:
  // 1) use initialPropertyId if provided and exists
  // 2) otherwise default to the first property in the list
  const initialPropertyIdStr =
    (initialPropertyId &&
      properties.some((p) => p.id === initialPropertyId) &&
      String(initialPropertyId)) ||
    (properties[0] ? String(properties[0].id) : "");

  const [propertyId, setPropertyId] = useState<string>(initialPropertyIdStr);
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState(""); // datetime-local string
  const [endAt, setEndAt] = useState("");
  const [notes, setNotes] = useState("");
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
      const res = await fetch("/api/open-homes", {
        method: "POST",
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
        console.error("Error creating open home:", json);
        alert("Something went wrong creating the open home.");
        return;
      }

      const { event } = await res.json();
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
          placeholder="e.g. Highlight views, mention shed, strong interest expected, prepare extra brochures, etc."
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-blue-600 text-white font-semibold px-5 py-2 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Create open home"}
      </button>
    </form>
  );
}
