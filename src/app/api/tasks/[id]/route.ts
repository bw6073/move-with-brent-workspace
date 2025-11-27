// src/app/api/tasks/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>; // Next 16: params is a Promise
};

// GET /api/tasks/[id]
export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const numericId = Number(id);

  if (!id || Number.isNaN(numericId)) {
    return NextResponse.json(
      { error: "Invalid task ID", rawId: id ?? null },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", numericId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/tasks/[id]] supabase error", error);
      return NextResponse.json(
        { error: "Failed to load task", supabaseError: error },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ task: data }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/tasks/[id]] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id]
export async function PUT(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const numericId = Number(id);

  if (!id || Number.isNaN(numericId)) {
    return NextResponse.json(
      { error: "Invalid task ID", rawId: id ?? null },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    title,
    notes,
    status,
    due_date,
    priority,
    related_property_id,
    related_contact_id,
  } = body ?? {};

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const updatePayload: any = {};

    if (typeof title === "string") updatePayload.title = title.trim();
    if (typeof notes === "string") updatePayload.notes = notes.trim() || null;
    if (notes === null) updatePayload.notes = null;

    if (typeof status === "string" || status === null)
      updatePayload.status = status;

    if (typeof due_date === "string" || due_date === null)
      updatePayload.due_date = due_date;

    if (typeof priority === "string") updatePayload.priority = priority;

    if (
      typeof related_property_id === "number" ||
      related_property_id === null
    ) {
      updatePayload.related_property_id = related_property_id;
    }

    if (typeof related_contact_id === "number" || related_contact_id === null) {
      updatePayload.related_contact_id = related_contact_id;
    }

    // ❌ no updated_at here – your table doesn't have it, so don't send it

    const { data, error } = await supabase
      .from("tasks")
      .update(updatePayload)
      .eq("id", numericId)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[PUT /api/tasks/[id]] supabase error", error);
      return NextResponse.json(
        { error: "Failed to update task", supabaseError: error },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Task not found after update" },
        { status: 404 }
      );
    }

    return NextResponse.json({ task: data }, { status: 200 });
  } catch (err) {
    console.error("[PUT /api/tasks/[id]] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id]
export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const numericId = Number(id);

  if (!id || Number.isNaN(numericId)) {
    return NextResponse.json(
      { error: "Invalid task ID", rawId: id ?? null },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", numericId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[DELETE /api/tasks/[id]] supabase error", error);
      return NextResponse.json(
        { error: "Failed to delete task", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/tasks/[id]] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
