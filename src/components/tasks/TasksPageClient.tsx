// src/components/tasks/TasksPageClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

export type TaskRow = {
  id: number;
  contact_id: number;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  related_appraisal_id: number | null;
  task_type?: string | null; // optional, ready for later
  contacts?: {
    id: number;
    name: string | null;
    preferred_name?: string | null;
  } | null;
};

type MinimalContact = {
  id: number;
  name: string;
  email: string | null;
};

export type TasksPageClientProps = {
  initialTasks: TaskRow[];
  initialShowNew?: boolean;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "No due date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No due date";

  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export function TasksPageClient({
  initialTasks,
  initialShowNew = false,
}: TasksPageClientProps) {
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);

  // ─────────────────────────────────────
  // SIMPLE STATS
  // ─────────────────────────────────────
  const todayMidnight = useMemo(() => new Date().setHours(0, 0, 0, 0), []);

  const { totalCount, openCount, overdueCount } = useMemo(() => {
    const total = tasks.length;
    let open = 0;
    let overdue = 0;

    for (const t of tasks) {
      const status = (t.status || "").toLowerCase();
      const isCompleted = status === "completed";

      if (!isCompleted) {
        open += 1;

        if (t.due_date) {
          const dueTime = new Date(t.due_date).getTime();
          if (!Number.isNaN(dueTime) && dueTime < todayMidnight) {
            overdue += 1;
          }
        }
      }
    }

    return { totalCount: total, openCount: open, overdueCount: overdue };
  }, [tasks, todayMidnight]);

  // ─────────────────────────────────────
  // FILTER STATE
  // ─────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "in_progress" | "completed"
  >("all");
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | "low" | "normal" | "high"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false); // if we later reload from server
  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────────────
  // CONTACTS (FOR NEW TASK)
  // ─────────────────────────────────────
  const [contacts, setContacts] = useState<MinimalContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadContacts = async () => {
      try {
        setContactsLoading(true);
        setContactsError(null);

        const res = await fetch("/api/contacts");
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("Failed to load contacts for task creation:", txt);
          if (!cancelled) {
            setContactsError("Could not load contacts.");
          }
          return;
        }

        const json = await res.json().catch(() => null);

        const rawList = Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
          ? json.items
          : [];

        const mapped: MinimalContact[] = rawList.map((c: any) => {
          const label =
            c.preferred_name ||
            c.name ||
            [c.first_name, c.last_name].filter(Boolean).join(" ") ||
            "Unnamed contact";

          return {
            id: c.id,
            name: label,
            email: c.email ?? null,
          };
        });

        if (!cancelled) {
          setContacts(mapped);
        }
      } catch (err) {
        console.error(
          "Unexpected error loading contacts for task creation",
          err
        );
        if (!cancelled) {
          setContactsError("Could not load contacts.");
        }
      } finally {
        if (!cancelled) {
          setContactsLoading(false);
        }
      }
    };

    void loadContacts();

    return () => {
      cancelled = true;
    };
  }, []);

  // ─────────────────────────────────────
  // NEW TASK PANEL STATE
  // ─────────────────────────────────────
  const [showCreate, setShowCreate] = useState(initialShowNew);
  const [createContactId, setCreateContactId] = useState<string>("");
  const [createTitle, setCreateTitle] = useState("");
  const [createPriority, setCreatePriority] = useState<
    "low" | "normal" | "high"
  >("normal");
  const [createDueDate, setCreateDueDate] = useState<string>(""); // yyyy-mm-dd
  const [createNotes, setCreateNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const resetCreateForm = () => {
    setCreateContactId("");
    setCreateTitle("");
    setCreatePriority("normal");
    setCreateDueDate("");
    setCreateNotes("");
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!createContactId) {
      alert("Please select a contact.");
      return;
    }
    if (!createTitle.trim()) {
      alert("Please add a task title.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const dueIso = createDueDate
        ? new Date(`${createDueDate}T00:00:00`).toISOString()
        : null;

      const payload = {
        contact_id: Number(createContactId),
        title: createTitle.trim(),
        priority: createPriority,
        status: "pending",
        due_date: dueIso,
        notes: createNotes.trim() || null,
      };

      const res = await fetch("/api/contact-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Failed to create task:", text);
        setError("Failed to create task.");
        return;
      }

      const json = await res.json().catch(() => null);
      const newTask: TaskRow | undefined = json?.task;

      if (newTask) {
        setTasks((prev) => [newTask, ...prev]);
        resetCreateForm();
      }
    } catch (err) {
      console.error("Unexpected error creating task", err);
      setError("Unexpected error creating task.");
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────
  // FILTERED VIEW
  // ─────────────────────────────────────
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (
        statusFilter !== "all" &&
        t.status.toLowerCase() !== statusFilter.toLowerCase()
      ) {
        return false;
      }

      if (
        priorityFilter !== "all" &&
        t.priority.toLowerCase() !== priorityFilter.toLowerCase()
      ) {
        return false;
      }

      if (searchTerm.trim()) {
        const needle = searchTerm.toLowerCase();
        const contactName =
          t.contacts?.preferred_name || t.contacts?.name || "";
        const haystack = [t.title, t.notes ?? "", contactName]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(needle)) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, statusFilter, priorityFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500">
            Tasks linked to your contacts – follow-ups, callbacks and reminders.
          </p>

          {/* Small stats row */}
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span>
              <span className="font-semibold text-slate-700">{openCount}</span>{" "}
              open
            </span>
            <span>
              <span className="font-semibold text-slate-700">
                {overdueCount}
              </span>{" "}
              overdue
            </span>
            <span>
              <span className="font-semibold text-slate-700">{totalCount}</span>{" "}
              total
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
        >
          {showCreate ? "Hide new task" : "+ New task"}
        </button>
      </header>

      {/* NEW TASK PANEL */}
      {showCreate && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Create new task
          </h2>

          {contactsError && (
            <p className="mb-2 text-xs text-red-600">{contactsError}</p>
          )}

          <form onSubmit={handleCreateTask} className="space-y-3 text-sm">
            {/* Contact + title */}
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Contact
                </label>
                <select
                  value={createContactId}
                  onChange={(e) => setCreateContactId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  disabled={contactsLoading}
                >
                  <option value="">Select contact…</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.email ? ` – ${c.email}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Task title
                </label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Call about appraisal, send pricing email…"
                />
              </div>
            </div>

            {/* Priority + due date */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Priority
                </label>
                <select
                  value={createPriority}
                  onChange={(e) =>
                    setCreatePriority(
                      e.target.value as "low" | "normal" | "high"
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Due date
                </label>
                <input
                  type="date"
                  value={createDueDate}
                  onChange={(e) => setCreateDueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Notes (optional)
              </label>
              <textarea
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={2}
                placeholder="Extra context, what was discussed, next steps…"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetCreateForm}
                className="rounded-full border border-slate-300 px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Create task"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* FILTER BAR */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as
                    | "all"
                    | "pending"
                    | "in_progress"
                    | "completed"
                )
              }
              className="rounded-full border border-slate-300 bg-white px-2 py-1"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(
                  e.target.value as "all" | "low" | "normal" | "high"
                )
              }
              className="rounded-full border border-slate-300 bg-white px-2 py-1"
            >
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="flex-1 min-w-[160px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by contact, title or notes…"
              className="w-full rounded-full border border-slate-300 px-3 py-1.5 text-xs"
            />
          </div>
        </div>

        {error && (
          <p className="mb-2 text-xs text-red-600">
            {error} Try refreshing the page.
          </p>
        )}

        {/* TASK LIST */}
        {loading && <p className="text-xs text-slate-500">Loading tasks…</p>}

        {!loading && filteredTasks.length === 0 && (
          <p className="text-xs text-slate-500">No tasks match your filters.</p>
        )}

        {!loading && filteredTasks.length > 0 && (
          <ul className="divide-y divide-slate-100 text-sm">
            {filteredTasks.map((t) => {
              const contactName =
                t.contacts?.preferred_name ||
                t.contacts?.name ||
                "No contact linked";

              const isOverdue =
                t.due_date &&
                new Date(t.due_date).getTime() <
                  new Date().setHours(0, 0, 0, 0);

              const priority = (t.priority || "normal").toLowerCase();
              const priorityLabel =
                priority === "high"
                  ? "High"
                  : priority === "low"
                  ? "Low"
                  : "Normal";

              const priorityClass =
                priority === "high"
                  ? "bg-red-100 text-red-700"
                  : priority === "low"
                  ? "bg-slate-50 text-slate-600"
                  : "bg-amber-100 text-amber-700";

              const notesPreview = (t.notes ?? "").trim();
              const notesShort =
                notesPreview.length > 140
                  ? `${notesPreview.slice(0, 137)}…`
                  : notesPreview;

              return (
                <li key={t.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    {/* LEFT – contact → title → notes (+ optional appraisal link) */}
                    <div className="min-w-0 flex-1">
                      {/* Contact */}
                      <div className="mb-0.5 text-xs text-slate-500 truncate">
                        {t.contacts?.id ? (
                          <a
                            href={`/contacts/${t.contacts.id}`}
                            className="underline-offset-2 hover:underline"
                          >
                            {contactName}
                          </a>
                        ) : (
                          contactName
                        )}
                      </div>

                      {/* Title */}
                      <div className="font-medium text-slate-900 truncate">
                        {t.title}
                      </div>

                      {/* Notes */}
                      {notesShort && (
                        <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
                          {notesShort}
                        </p>
                      )}

                      {/* Linked appraisal (if any) */}
                      {t.related_appraisal_id && (
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          Linked to{" "}
                          <a
                            href={`/appraisals/${t.related_appraisal_id}/edit`}
                            className="underline-offset-2 hover:underline"
                          >
                            appraisal #{t.related_appraisal_id}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* RIGHT – status / priority / due date */}
                    <div className="ml-3 flex shrink-0 flex-col items-end gap-1 text-[11px]">
                      {/* Status */}
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium uppercase tracking-wide ${
                          t.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.status}
                      </span>

                      {/* Priority */}
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium uppercase tracking-wide ${priorityClass}`}
                      >
                        {priorityLabel}
                      </span>

                      {/* Due date */}
                      <span
                        className={
                          "mt-1 " +
                          (isOverdue ? "text-red-600" : "text-slate-500")
                        }
                      >
                        {t.due_date ? formatDate(t.due_date) : "No due date"}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
