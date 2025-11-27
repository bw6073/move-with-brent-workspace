// src/app/tasks/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type TaskRow = {
  id: number;
  title: string | null;
  status: string | null;
  notes: string | null;
  due_date: string | null;
  priority: string | null;
  related_property_id?: number | null;
  related_contact_id?: number | null;
  created_at: string | null;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "No due date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No due date";
  return d.toLocaleDateString("en-AU");
};

const originInfo = (task: TaskRow) => {
  if (task.related_property_id) {
    return {
      label: `Property #${task.related_property_id}`,
      href: `/properties/${task.related_property_id}`,
      type: "property",
    };
  }
  if (task.related_contact_id) {
    return {
      label: `Contact #${task.related_contact_id}`,
      href: `/contacts/${task.related_contact_id}`,
      type: "contact",
    };
  }
  return null;
};

export default async function TasksPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-6 text-sm text-slate-600">
        You need to sign in to see your tasks.
      </div>
    );
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[/tasks] supabase error", error);
    return (
      <div className="mx-auto max-w-4xl px-6 py-6 text-sm text-red-600">
        There was a problem loading your tasks.
      </div>
    );
  }

  const tasks: TaskRow[] = (data ?? []) as any[];

  return (
    <div className="mx-auto max-w-5xl px-6 py-6 text-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tasks</h1>
          <p className="mt-1 text-xs text-slate-500">
            Includes tasks from contacts and properties.
          </p>
        </div>

        {/* If you want a global new-task button */}
        <Link
          href="/tasks/new"
          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
        >
          + New task
        </Link>
      </div>

      {tasks.length === 0 ? (
        <p className="text-xs text-slate-500">
          You don&apos;t have any tasks yet.
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => {
            const origin = originInfo(t);
            return (
              <div
                key={t.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-slate-900">
                      {t.title || "Untitled task"}
                    </span>
                    {t.status && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-700">
                        {t.status}
                      </span>
                    )}
                    {t.priority && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                        {t.priority}
                      </span>
                    )}
                  </div>
                  {t.notes && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">
                      {t.notes}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>Due: {formatDate(t.due_date)}</span>
                    {origin && (
                      <>
                        <span>•</span>
                        <Link
                          href={origin.href}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-200"
                        >
                          {origin.type === "property" ? "Property" : "Contact"}:{" "}
                          {origin.label}
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <Link
                    href={`/tasks/${t.id}/edit`}
                    className="text-[11px] font-medium text-slate-600 hover:underline"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
