// src/app/api/contact-tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>; // Next 16
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const taskId = Number(id);

    if (!id || Number.isNaN(taskId)) {
      return NextResponse.json(
        { error: "Invalid task ID", rawId: id ?? null },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Unauthorised in PATCH /contact-tasks/[id]", userError);
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const update: Record<string, any> = {
      task_type: body.task_type,
      title: body.title,
      due_date: body.due_date,
      priority: body.priority,
      status: body.status,
      notes: body.notes,
      related_appraisal_id: body.related_appraisal_id,
    };

    Object.keys(update).forEach((k) => {
      if (update[k] === undefined) delete update[k];
    });

    const { data, error } = await supabase
      .from("contact_tasks")
      .update(update)
      .eq("id", taskId)
      .eq("user_id", user.id)
      .select(
        `
          id,
          contact_id,
          task_type,
          title,
          due_date,
          priority,
          status,
          notes,
          related_appraisal_id,
          created_at,
          updated_at
        `
      )
      .single();

    if (error || !data) {
      console.error(
        "Failed to update contact task",
        JSON.stringify(error, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to update task", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ task: data });
  } catch (err) {
    console.error("Unexpected error in PATCH /contact-tasks/[id]", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const taskId = Number(id);

    if (!id || Number.isNaN(taskId)) {
      return NextResponse.json(
        { error: "Invalid task ID", rawId: id ?? null },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Unauthorised in DELETE /contact-tasks/[id]", userError);
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { error } = await supabase
      .from("contact_tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "Failed to delete contact task",
        JSON.stringify(error, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to delete task", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error in DELETE /contact-tasks/[id]", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
