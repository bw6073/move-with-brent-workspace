// src/components/contacts/ContactTimelineCard.tsx
"use client";

import React, { useEffect, useState } from "react";
import type { ContactActivity } from "./ContactActivityCard";

type ContactTask = {
  id: number;
  related_contact_id: number | null;
  related_property_id: number | null;
  task_type: string | null;
  title: string | null;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ContactNote = {
  id: number;
  contact_id: number;
  note: string;
  created_at: string | null;
  updated_at: string | null;
};

type ContactAppraisal = {
  id: number;
  appraisalTitle: string | null;
  streetAddress: string | null;
  suburb: string | null;
  status: string | null;
  created_at: string | null;
};

type Props = {
  contactId: number;
};

// ---- date helpers ------------------------------------------------

const formatDateTime = (iso: string | null) => {
  if (!iso) return "No date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No date";

  const date = d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const time = d.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${date} ${time}`;
};

const formatDateOnly = (iso: string | null) => {
  if (!iso) return "No date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No date";
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const taskTypeLabel = (t: string | null | undefined) =>
  (t ?? "task").replace(/_/g, " ");

const statusBadgeClass = (status: string | null) => {
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "cancelled") return "bg-slate-100 text-slate-500";
  return "bg-slate-100 text-slate-700";
};

const priorityBadgeClass = (priority: string | null) => {
  if (priority === "high") return "bg-red-100 text-red-700";
  if (priority === "low") return "bg-slate-100 text-slate-600";
  return "bg-amber-100 text-amber-700";
};

const activityTypeLabel = (t: string) => {
  switch (t) {
    case "call":
      return "Call";
    case "email":
      return "Email";
    case "sms":
      return "SMS";
    case "meeting":
      return "Meeting";
    default:
      return t;
  }
};

const appraisalStatusBadgeClass = (status: string | null) => {
  if (status === "complete" || status === "completed") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "cancelled") {
    return "bg-slate-100 text-slate-500";
  }
  return "bg-indigo-100 text-indigo-700";
};

// ---- unified timeline type ---------------------------------------

type TimelineItem =
  | {
      kind: "task";
      id: string;
      sortDate: string;
      task: ContactTask;
    }
  | {
      kind: "activity";
      id: string;
      sortDate: string;
      activity: ContactActivity;
    }
  | {
      kind: "note";
      id: string;
      sortDate: string;
      note: ContactNote;
    }
  | {
      kind: "appraisal";
      id: string;
      sortDate: string;
      appraisal: ContactAppraisal;
    };

const PAGE_SIZE = 20;

function ContactTimelineCard({ contactId }: Props) {
  const [allItems, setAllItems] = useState<TimelineItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contactId) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setVisibleCount(PAGE_SIZE); // reset when switching contact

        const [tasksRes, activitiesRes, notesRes, appraisalsRes] =
          await Promise.all([
            fetch(`/api/contacts/${contactId}/tasks`),
            fetch(`/api/contact-activities?contactId=${contactId}`),
            fetch(`/api/contacts/${contactId}/notes`),
            fetch(`/api/appraisals?contactId=${contactId}`),
          ]);

        if (
          !tasksRes.ok ||
          !activitiesRes.ok ||
          !notesRes.ok ||
          !appraisalsRes.ok
        ) {
          const tText = await tasksRes.text().catch(() => "");
          const aText = await activitiesRes.text().catch(() => "");
          const nText = await notesRes.text().catch(() => "");
          const apText = await appraisalsRes.text().catch(() => "");
          console.error("Failed to load timeline data:", {
            tasks: tText,
            activities: aText,
            notes: nText,
            appraisals: apText,
          });
          if (!cancelled) {
            setError("Could not load timeline activity.");
            setLoading(false);
          }
          return;
        }

        const [tasksJson, actsJson, notesJson, appJson] = await Promise.all([
          tasksRes.json().catch(() => null),
          activitiesRes.json().catch(() => null),
          notesRes.json().catch(() => null),
          appraisalsRes.json().catch(() => null),
        ]);

        let tasks: ContactTask[] = [];
        if (Array.isArray(tasksJson)) {
          tasks = tasksJson as ContactTask[];
        } else if (tasksJson && Array.isArray(tasksJson.tasks)) {
          tasks = tasksJson.tasks as ContactTask[];
        } else if (tasksJson && Array.isArray(tasksJson.items)) {
          tasks = tasksJson.items as ContactTask[];
        }

        const activities: ContactActivity[] = Array.isArray(actsJson?.items)
          ? actsJson.items
          : [];

        const notes: ContactNote[] = Array.isArray(notesJson?.notes)
          ? notesJson.notes
          : [];

        let appraisals: ContactAppraisal[] = [];
        if (Array.isArray(appJson)) {
          appraisals = appJson as ContactAppraisal[];
        } else if (appJson && Array.isArray(appJson.items)) {
          appraisals = appJson.items as ContactAppraisal[];
        }

        const combined: TimelineItem[] = [
          ...tasks.map((t) => ({
            kind: "task" as const,
            id: `task-${t.id}`,
            sortDate: (t.created_at || t.due_date || "") ?? "",
            task: t,
          })),
          ...activities.map((a) => ({
            kind: "activity" as const,
            id: `activity-${a.id}`,
            sortDate: (a.activity_at || a.created_at || "") ?? "",
            activity: a,
          })),
          ...notes.map((n) => ({
            kind: "note" as const,
            id: `note-${n.id}`,
            sortDate: (n.created_at || n.updated_at || "") ?? "",
            note: n,
          })),
          ...appraisals.map((ap) => ({
            kind: "appraisal" as const,
            id: `appraisal-${ap.id}`,
            sortDate: ap.created_at ?? "",
            appraisal: ap,
          })),
        ].filter((x) => x.sortDate);

        combined.sort((a, b) => b.sortDate.localeCompare(a.sortDate));

        if (!cancelled) {
          setAllItems(combined);
          setLoading(false);
        }
      } catch (err) {
        console.error("Unexpected error loading contact timeline:", err);
        if (!cancelled) {
          setError("Could not load timeline activity.");
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [contactId]);

  const visibleItems = allItems.slice(0, visibleCount);
  const hasMore = visibleCount < allItems.length;

  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, allItems.length));
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Timeline</h2>
          <p className="text-xs text-slate-500">
            Unified history for this contact (tasks, calls, emails, notes,
            appraisals).
          </p>
        </div>
        {!loading && allItems.length > 0 && (
          <span className="text-[10px] text-slate-400">
            Showing {visibleItems.length} of {allItems.length}
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600">
          {error} (you can still use the individual cards below.)
        </p>
      )}

      {loading && !error && (
        <p className="text-xs text-slate-500">Loading activity…</p>
      )}

      {!loading && !error && allItems.length === 0 && (
        <p className="text-xs text-slate-500">
          No activity yet. Add a task, log a call/email, write a note or create
          an appraisal to start the timeline.
        </p>
      )}

      {!loading && !error && allItems.length > 0 && (
        <>
          <ol className="relative mt-2 space-y-3 border-l border-slate-200 pl-3 text-xs">
            {visibleItems.map((item) => {
              // TASK
              if (item.kind === "task") {
                const task = item.task;
                const isCompleted = task.status === "completed";

                return (
                  <li key={item.id} className="relative pl-2">
                    <span className="absolute -left-[9px] mt-1.5 h-2.5 w-2.5 rounded-full border border-slate-300 bg-white" />
                    <div className="flex flex-col gap-1 rounded-md bg-slate-50/60 p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          {taskTypeLabel(task.task_type)}
                        </span>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusBadgeClass(
                            task.status
                          )}`}
                        >
                          {task.status}
                        </span>

                        {task.priority && task.priority !== "normal" && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${priorityBadgeClass(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>
                        )}

                        <span className="ml-auto text-[10px] text-slate-500">
                          {task.created_at
                            ? formatDateTime(task.created_at)
                            : task.due_date
                            ? `Due ${formatDateOnly(task.due_date)}`
                            : "No date"}
                        </span>
                      </div>

                      <div
                        className={`text-[13px] font-medium ${
                          isCompleted
                            ? "text-slate-700 line-through"
                            : "text-slate-900"
                        }`}
                      >
                        {task.title}
                      </div>

                      {task.notes && (
                        <div className="text-[11px] text-slate-600">
                          {task.notes}
                        </div>
                      )}

                      {task.due_date && (
                        <div className="text-[10px] text-slate-500">
                          Due: {formatDateOnly(task.due_date)}
                        </div>
                      )}
                    </div>
                  </li>
                );
              }

              // ACTIVITY
              if (item.kind === "activity") {
                const activity = item.activity;
                return (
                  <li key={item.id} className="relative pl-2">
                    <span className="absolute -left-[9px] mt-1.5 h-2.5 w-2.5 rounded-full border border-slate-300 bg-white" />
                    <div className="flex flex-col gap-1 rounded-md bg-blue-50/60 p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          {activityTypeLabel(activity.activity_type)}
                        </span>
                        {activity.direction && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">
                            {activity.direction}
                          </span>
                        )}
                        <span className="ml-auto text-[10px] text-slate-500">
                          {formatDateTime(
                            activity.activity_at ?? activity.created_at
                          )}
                        </span>
                      </div>

                      {activity.subject && (
                        <div className="text-[13px] font-medium text-slate-900">
                          {activity.subject}
                        </div>
                      )}

                      {activity.summary && (
                        <div className="text-[11px] text-slate-700">
                          {activity.summary}
                        </div>
                      )}

                      {activity.outcome && (
                        <div className="text-[10px] text-slate-500">
                          <span className="font-semibold">Outcome: </span>
                          {activity.outcome}
                        </div>
                      )}
                    </div>
                  </li>
                );
              }

              // NOTE
              if (item.kind === "note") {
                const note = item.note;
                return (
                  <li key={item.id} className="relative pl-2">
                    <span className="absolute -left-[9px] mt-1.5 h-2.5 w-2.5 rounded-full border border-slate-300 bg-white" />
                    <div className="flex flex-col gap-1 rounded-md bg-amber-50/70 p-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Note
                        </span>
                        <span className="ml-auto text-[10px] text-slate-500">
                          {formatDateTime(note.created_at ?? note.updated_at)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-800 whitespace-pre-wrap">
                        {note.note}
                      </div>
                    </div>
                  </li>
                );
              }

              // APPRAISAL
              const ap = item.appraisal;
              const title =
                ap.appraisalTitle ||
                ap.streetAddress ||
                (ap.id ? `Appraisal #${ap.id}` : "Property appraisal");

              return (
                <li key={item.id} className="relative pl-2">
                  <span className="absolute -left-[9px] mt-1.5 h-2.5 w-2.5 rounded-full border border-slate-300 bg-white" />
                  <div className="flex flex-col gap-1 rounded-md bg-emerald-50/70 p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Appraisal
                      </span>
                      {ap.status && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${appraisalStatusBadgeClass(
                            ap.status
                          )}`}
                        >
                          {ap.status}
                        </span>
                      )}
                      <span className="ml-auto text-[10px] text-slate-500">
                        {formatDateTime(ap.created_at)}
                      </span>
                    </div>

                    <div className="text-[13px] font-medium text-slate-900">
                      {title}
                    </div>

                    {(ap.streetAddress || ap.suburb) && (
                      <div className="text-[11px] text-slate-700">
                        {ap.streetAddress}
                        {ap.suburb ? `, ${ap.suburb}` : ""}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {hasMore && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={handleShowMore}
                className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Show more
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export { ContactTimelineCard };
