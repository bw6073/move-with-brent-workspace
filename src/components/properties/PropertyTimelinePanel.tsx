// src/components/properties/PropertyTimelinePanel.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Props = {
  propertyId: number;
};

type TimelineItem = {
  id: string;
  type: "property" | "appraisal" | "task";
  date: string | null;
  title: string;
  subtitle?: string | null;
  href?: string | null;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "No date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No date";
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const typeBadgeClass = (type: TimelineItem["type"]) => {
  switch (type) {
    case "appraisal":
      return "bg-indigo-100 text-indigo-700";
    case "task":
      return "bg-amber-100 text-amber-700";
    case "property":
    default:
      return "bg-slate-100 text-slate-700";
  }
};

export function PropertyTimelinePanel({ propertyId }: Props) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/properties/${propertyId}/timeline`);

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("Failed to load timeline:", res.status, txt);
          if (!ignore) {
            setError("Could not load timeline.");
            setItems([]);
          }
          return;
        }

        const json = await res.json();
        const list: TimelineItem[] = Array.isArray(json.items)
          ? json.items
          : [];

        if (!ignore) {
          setItems(list);
        }
      } catch (err) {
        console.error("Unexpected error loading timeline:", err);
        if (!ignore) {
          setError("Could not load timeline.");
          setItems([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [propertyId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Timeline
        </h3>
      </div>

      {loading && <p className="text-xs text-slate-500">Loading timeline…</p>}

      {error && !loading && <p className="text-xs text-red-600">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="text-xs text-slate-500">
          No timeline items yet. Create appraisals or tasks to see activity
          here.
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <ol className="space-y-3">
          {items.map((item, idx) => {
            const showConnector = idx < items.length - 1;
            const content = (
              <div className="flex gap-3">
                {/* Timeline rail */}
                <div className="flex flex-col items-center">
                  <span className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
                  {showConnector && (
                    <span className="mt-1 flex-1 w-px bg-slate-200" />
                  )}
                </div>

                {/* Card */}
                <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-xs font-semibold text-slate-900">
                          {item.title}
                        </span>
                        <span
                          className={
                            "rounded-full px-2 py-[2px] text-[10px] font-medium uppercase tracking-wide " +
                            typeBadgeClass(item.type)
                          }
                        >
                          {item.type}
                        </span>
                      </div>
                      {item.subtitle && (
                        <div className="mt-0.5 text-[11px] text-slate-600">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {formatDate(item.date)}
                    </span>
                  </div>
                </div>
              </div>
            );

            if (item.href) {
              return (
                <li key={item.id}>
                  <Link href={item.href} className="block hover:no-underline">
                    {content}
                  </Link>
                </li>
              );
            }

            return <li key={item.id}>{content}</li>;
          })}
        </ol>
      )}
    </div>
  );
}
