// src/app/api/contacts/[id]/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>; // Next 16: params is a Promise
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const contactId = Number(id);

    if (!id || Number.isNaN(contactId)) {
      return NextResponse.json(
        { error: "Invalid contact ID", rawId: id ?? null },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "No authenticated user in GET /contacts/[id]/tasks",
        userError
      );
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("contact_tasks")
      .select(
        `
        id,
        user_id,
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
      .eq("user_id", user.id)
      .eq("contact_id", contactId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "Failed to load tasks in GET /contacts/[id]/tasks",
        JSON.stringify(error, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to load tasks", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ tasks: data ?? [] });
  } catch (err) {
    console.error("Unexpected error in GET /contacts/[id]/tasks", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const contactId = Number(id);

    if (!id || Number.isNaN(contactId)) {
      return NextResponse.json(
        { error: "Invalid contact ID", rawId: id ?? null },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "No authenticated user in POST /contacts/[id]/tasks",
        userError
      );
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.title) {
      return NextResponse.json(
        { error: "Missing task title or invalid body" },
        { status: 400 }
      );
    }

    const insertData = {
      user_id: user.id,
      contact_id: contactId,
      task_type: body.task_type ?? "general",
      title: body.title,
      due_date: body.due_date ?? null,
      priority: body.priority ?? "normal",
      status: body.status ?? "pending",
      notes: body.notes ?? null,
      related_appraisal_id: body.related_appraisal_id ?? null,
    };

    const { data, error } = await supabase
      .from("contact_tasks")
      .insert(insertData)
      .select(
        `
        id,
        user_id,
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
        "Failed to create task in POST /contacts/[id]/tasks",
        JSON.stringify(error, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to create task", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ task: data });
  } catch (err) {
    console.error("Unexpected error in POST /contacts/[id]/tasks", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
