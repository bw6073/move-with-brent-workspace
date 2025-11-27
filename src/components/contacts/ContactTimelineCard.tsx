// src/components/contacts/ContactTimelineCard.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type TimelineKind = "note" | "activity" | "task" | "appraisal";

export type TimelineItem = {
  id: string;
  kind: TimelineKind;
  isoDate: string | null;
  title: string;
  description?: string | null;
  meta?: Record<string, any>;
};

type Props = {
  contactId: number;
};

export function ContactTimelineCard({ contactId }: Props) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/contact-timeline?contactId=${contactId}`);

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("Failed to load contact timeline:", text);
          if (!cancelled) {
            setError("Could not load timeline.");
            setLoading(false);
          }
          return;
        }

        const json = await res.json().catch(() => null);
        const list: TimelineItem[] = Array.isArray(json?.items)
          ? json.items
          : [];

        if (!cancelled) {
          setItems(list);
          setLoading(false);
        }
      } catch (err) {
        console.error("Unexpected error loading contact timeline", err);
        if (!cancelled) {
          setError("Could not load timeline.");
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

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";

    // Short, consistent format
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const kindBadge = (kind: TimelineKind, meta?: Record<string, any>) => {
    const baseClass =
      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";

    switch (kind) {
      case "note":
        return (
          <span className={`${baseClass} bg-amber-50 text-amber-700`}>
            Note
          </span>
        );
      case "activity": {
        const type = meta?.type as string | undefined;
        const label =
          type === "call"
            ? "Call"
            : type === "email"
            ? "Email"
            : type === "sms"
            ? "SMS"
            : type === "meeting"
            ? "Meeting"
            : "Activity";
        return (
          <span className={`${baseClass} bg-sky-50 text-sky-700`}>{label}</span>
        );
      }
      case "task": {
        const status = (meta?.status as string | undefined) ?? "pending";
        return (
          <span className={`${baseClass} bg-violet-50 text-violet-700`}>
            Task · {status}
          </span>
        );
      }
      case "appraisal":
        return (
          <span className={`${baseClass} bg-emerald-50 text-emerald-700`}>
            Appraisal
          </span>
        );
      default:
        return null;
    }
  };

  const secondaryMeta = (item: TimelineItem) => {
    if (item.kind === "activity") {
      const direction = item.meta?.direction as string | undefined;
      const outcome = item.meta?.outcome as string | undefined;
      const bits = [];
      if (direction) bits.push(direction);
      if (outcome) bits.push(`Outcome: ${outcome}`);
      if (!bits.length) return null;
      return bits.join(" • ");
    }

    if (item.kind === "task") {
      const priority = item.meta?.priority as string | undefined;
      const dueDateIso = item.meta?.dueDate as string | undefined;
      const dueLabel = dueDateIso
        ? `Due ${formatDateTime(dueDateIso)}`
        : undefined;
      const bits = [];
      if (priority) bits.push(`Priority: ${priority}`);
      if (dueLabel) bits.push(dueLabel);
      if (!bits.length) return null;
      return bits.join(" • ");
    }

    if (item.kind === "appraisal") {
      const status = item.meta?.status as string | undefined;
      const role = item.meta?.role as string | undefined;
      const bits = [];
      if (status) bits.push(`Status: ${status}`);
      if (role) bits.push(`Role: ${role}`);
      if (!bits.length) return null;
      return bits.join(" • ");
    }

    return null;
  };

  const renderTitle = (item: TimelineItem) => {
    if (item.kind === "appraisal" && item.meta?.appraisalId) {
      return (
        <Link
          href={`/appraisals/${item.meta.appraisalId}/edit`}
          className="font-medium text-slate-900 hover:underline"
        >
          {item.title}
        </Link>
      );
    }

    return <span className="font-medium text-slate-900">{item.title}</span>;
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Timeline</h2>
          <p className="text-xs text-slate-500">
            Combined view of notes, calls, emails, tasks and appraisals.
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-2 text-xs text-red-600">
          {error} (you can still add notes, tasks or activities below.)
        </p>
      )}

      {loading && !error && (
        <p className="mb-2 text-xs text-slate-500">Loading timeline…</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-xs text-slate-500">
          No activity yet. As you add notes, log calls/emails, create tasks and
          appraisals, they’ll appear here in date order.
        </p>
      )}

      {!loading && items.length > 0 && (
        <ul className="space-y-2 text-xs">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex gap-3 rounded-lg border border-slate-200 px-3 py-2"
            >
              {/* Timeline marker */}
              <div className="flex flex-col items-center pt-1">
                <div className="h-2 w-2 rounded-full bg-slate-400" />
                <div className="flex-1 w-px bg-slate-200" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {kindBadge(item.kind, item.meta)}
                    {renderTitle(item)}
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {formatDateTime(item.isoDate)}
                  </span>
                </div>

                {item.description && (
                  <p className="text-[11px] text-slate-700">
                    {item.description}
                  </p>
                )}

                {secondaryMeta(item) && (
                  <p className="text-[10px] text-slate-500">
                    {secondaryMeta(item)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
