// src/components/properties/PropertyActivityCard.tsx
"use client";

import React, { useEffect, useState } from "react";
import { toastError } from "@/lib/toast";

type PropertyActivity = {
  id: number;
  property_id: number;
  activity_type: "call" | "email" | "sms" | "meeting" | "note" | string;
  direction: "inbound" | "outbound" | null;
  subject: string | null;
  summary: string | null;
  outcome: string | null;
  channel: string | null;
  activity_at: string | null;
  created_at: string | null;
};

type Props = {
  propertyId: number;
};

export function PropertyActivityCard({ propertyId }: Props) {
  const [items, setItems] = useState<PropertyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activityType, setActivityType] = useState<"call" | "email" | "note">("call");
  const [direction, setDirection] = useState<"inbound" | "outbound">("outbound");
  const [subject, setSubject] = useState("");
  const [summary, setSummary] = useState("");
  const [outcome, setOutcome] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/property-activities?propertyId=${propertyId}`);

        if (!res.ok) {
          if (!cancelled) {
            setError("Could not load activity log.");
            setLoading(false);
          }
          return;
        }

        const json = await res.json().catch(() => null);
        const list = Array.isArray(json?.items) ? json.items : [];

        if (!cancelled) {
          setItems(list);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load activity log.");
          setLoading(false);
        }
      }
    };

    if (propertyId) void load();

    return () => { cancelled = true; };
  }, [propertyId]);

  const resetForm = () => {
    setActivityType("call");
    setDirection("outbound");
    setSubject("");
    setSummary("");
    setOutcome("");
  };

  const formatDatetime = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const typeLabel = (t: string) => {
    switch (t) {
      case "call": return "Call";
      case "email": return "Email";
      case "sms": return "SMS";
      case "meeting": return "Meeting";
      case "note": return "Note";
      default: return t;
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!summary.trim() && !subject.trim()) {
      toastError("Please add at least a subject or summary.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        property_id: propertyId,
        activity_type: activityType,
        direction: activityType === "note" ? null : direction,
        subject: subject.trim() || null,
        summary: summary.trim() || null,
        outcome: outcome.trim() || null,
      };

      const res = await fetch("/api/property-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setError("Could not save activity.");
        return;
      }

      const json = await res.json().catch(() => null);
      const newActivity: PropertyActivity | null = json?.activity ?? null;
      if (newActivity) {
        setItems((prev) => [newActivity, ...prev]);
        resetForm();
      }
    } catch {
      setError("Unexpected error while saving activity.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this log entry? This can't be undone.")) return;

    try {
      setDeletingIds((prev) => [...prev, id]);

      const res = await fetch(`/api/property-activities/${id}`, { method: "DELETE" });

      if (!res.ok) {
        toastError("Could not delete this entry.");
        return;
      }

      setItems((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toastError("Unexpected error while deleting.");
    } finally {
      setDeletingIds((prev) => prev.filter((x) => x !== id));
    }
  };

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-xs font-semibold text-slate-900">Activity log</h2>
        <p className="text-[11px] text-slate-500">
          Log calls, emails and notes for this property.
        </p>
      </div>

      {error && (
        <p className="mb-2 text-xs text-red-600">{error}</p>
      )}
      {loading && !error && (
        <p className="mb-2 text-[11px] text-slate-500">Loading…</p>
      )}

      {/* Add form */}
      <form onSubmit={handleAdd} className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-500">Type:</span>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as "call" | "email" | "note")}
              className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px]"
            >
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="note">Note</option>
            </select>
          </div>

          {activityType !== "note" && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500">Direction:</span>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as "inbound" | "outbound")}
                className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px]"
              >
                <option value="outbound">Outbound</option>
                <option value="inbound">Inbound</option>
              </select>
            </div>
          )}
        </div>

        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={
            activityType === "note"
              ? "Note title (optional)"
              : activityType === "call"
              ? "Call subject (e.g. Follow-up on appraisal)"
              : "Email subject"
          }
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
        />

        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder={activityType === "note" ? "Note…" : "Notes from the call/email…"}
          className="min-h-[60px] w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
        />

        {activityType !== "note" && (
          <input
            type="text"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="Outcome / next step (optional)"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
          />
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {saving
              ? "Saving…"
              : activityType === "call"
              ? "Log call"
              : activityType === "email"
              ? "Log email"
              : "Add note"}
          </button>
        </div>
      </form>

      {/* Activity list */}
      {!loading && items.length === 0 && !error && (
        <p className="text-[11px] text-slate-500">No activity logged yet.</p>
      )}

      {!loading && items.length > 0 && (
        <ul className="space-y-2 text-xs">
          {items.map((a) => {
            const isDeleting = deletingIds.includes(a.id);
            return (
              <li
                key={a.id}
                className="rounded-lg border border-slate-200 px-3 py-2"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      {typeLabel(a.activity_type)}
                    </span>
                    {a.direction && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">
                        {a.direction}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      {formatDatetime(a.activity_at ?? a.created_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      disabled={isDeleting}
                      className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                      title="Delete entry"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {a.subject && (
                  <div className="mb-0.5 font-medium text-slate-900">{a.subject}</div>
                )}
                {a.summary && (
                  <div className="text-[11px] text-slate-700">{a.summary}</div>
                )}
                {a.outcome && (
                  <div className="mt-1 text-[10px] text-slate-500">
                    <span className="font-semibold">Outcome: </span>{a.outcome}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
