// src/app/tasks/[id]/edit/page.tsx
import { createClient } from "@/lib/supabase/server";
import TaskForm from "@/components/tasks/TaskForm";

type PageProps = {
  params: Promise<{ id: string }>; // Next 16: params is a Promise
};

export default async function EditTaskPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number(id);

  if (!id || Number.isNaN(numericId)) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6 text-sm text-red-600">
        Invalid task ID.
      </div>
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6 text-sm text-slate-600">
        You need to sign in to edit tasks.
      </div>
    );
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", numericId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[/tasks/[id]/edit] supabase error", error);
    return (
      <div className="mx-auto max-w-3xl px-6 py-6 text-sm text-red-600">
        There was a problem loading this task.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6 text-sm text-slate-600">
        Task not found.
      </div>
    );
  }

  const row: any = data;

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <TaskForm
        mode="edit"
        taskId={numericId}
        initialValues={{
          title: row.title,
          notes: row.notes,
          status: row.status,
          due_date: row.due_date,
          related_property_id: row.related_property_id,
          priority: row.priority ?? "normal",
        }}
      />
    </div>
  );
}
