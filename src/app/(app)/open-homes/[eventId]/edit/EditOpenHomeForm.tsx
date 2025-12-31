// src/app/(app)/open-homes/[eventId]/edit/EditOpenHomeForm.tsx
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

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
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert "yyyy-MM-ddTHH:mm" (datetime-local) into an ISO string.
 * Note: the browser interprets datetime-local as local time.
 */
function localInputToIso(localValue: string): string {
  // new Date("yyyy-MM-ddTHH:mm") is treated as local time in modern browsers
  return new Date(localValue).toISOString();
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
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProperty = useMemo(() => {
    const id = Number(propertyId);
    if (!Number.isFinite(id)) return null;
    return properties.find((p) => p.id === id) || null;
  }, [propertyId, properties]);

  const formatPropertyLabel = (p: Property) =>
    `${p.street_address}, ${p.suburb} ${p.state} ${p.postcode}`;

  const validate = () => {
    if (!propertyId) return "Please select a property.";
    if (!startAt) return "Please select a start date and time.";

    if (endAt) {
      const start = new Date(startAt).getTime();
      const end = new Date(endAt).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
        return "End time must be after the start time.";
      }
    }
    return null;
  };

  const syncToGoogleCalendar = async () => {
    setSyncing(true);
    setError(null);

    try {
      const res = await fetch(`/api/open-homes/${event.id}/sync-calendar`, {
        method: "POST",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to sync to Google Calendar.");
      }

      return true;
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        propertyId: Number(propertyId),
        title: title.trim() || null,
        startAt: localInputToIso(startAt),
        endAt: endAt ? localInputToIso(endAt) : null,
        notes: notes.trim() || null,
      };

      const res = await fetch(`/api/open-homes/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("Error updating open home:", json);
        setError(json?.error || "Something went wrong saving changes.");
        return;
      }

      // 🔗 Auto-sync to Google Calendar (non-blocking)
      try {
        await fetch(`/api/open-homes/${event.id}/sync-calendar`, {
          method: "POST",
        });
      } catch {
        // Calendar sync should never block saving
      }

      router.push(`/open-homes/${event.id}`);
      router.refresh();
    } catch (err) {
      console.error("Unexpected error saving open home:", err);
      setError("Unexpected error saving changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Property */}
      <div>
        <label className="mb-1 block text-sm text-slate-700">Property</label>
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          disabled={saving}
        >
          <option value="">Select property…</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {formatPropertyLabel(p)}
            </option>
          ))}
        </select>
        {selectedProperty && (
          <p className="mt-1 text-xs text-slate-500">
            Selected: {formatPropertyLabel(selectedProperty)}
          </p>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="mb-1 block text-sm text-slate-700">
          Title (optional, e.g. &quot;Saturday 11am Home Open&quot;)
        </label>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={saving}
          placeholder="Home Open"
        />
      </div>

      {/* Start / end */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <label className="mb-1 block text-sm text-slate-700">Start</label>
          <input
            type="datetime-local"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm text-slate-700">
            End (optional, usually 30–60 mins later)
          </label>
          <input
            type="datetime-local"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1 block text-sm text-slate-700">
          Notes (agent only)
        </label>
        <textarea
          className="min-h-[90px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={saving}
          placeholder="e.g. Updated time, changed to Sunday, combine with second inspection, etc."
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>

        <button
          type="button"
          disabled={saving || syncing}
          onClick={async () => {
            try {
              await syncToGoogleCalendar();
              alert("Home open synced to Google Calendar.");
            } catch (e: any) {
              setError(e?.message || "Failed to sync to Google Calendar.");
            }
          }}
          className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {syncing ? "Syncing…" : "Sync to Google Calendar"}
        </button>

        <button
          type="button"
          onClick={() => router.push(`/open-homes/${event.id}`)}
          className="text-sm text-slate-600 hover:text-slate-900"
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
