// src/app/api/contact-tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authed user for RLS
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("No authenticated user in POST /contact-tasks", userError);
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const insert = {
      user_id: user.id,
      contact_id: body.contact_id,
      title: body.title,
      notes: body.notes ?? null,
      task_type: body.task_type ?? "general",
      priority: body.priority ?? "normal",
      status: body.status ?? "pending",
      due_date: body.due_date ?? null,
      related_appraisal_id: body.related_appraisal_id ?? null,
    };

    const { data, error } = await supabase
      .from("contact_tasks")
      .insert(insert)
      .select(
        `
        id,
        contact_id,
        title,
        notes,
        priority,
        status,
        task_type,
        due_date,
        created_at,
        updated_at,
        contacts:contacts (
          id,
          preferred_name,
          name
        )
      `
      )
      .single();

    if (error || !data) {
      console.error(
        "Failed to create contact task",
        JSON.stringify(error, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to create task", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ task: data });
  } catch (err) {
    console.error("Unexpected error in POST /contact-tasks", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
