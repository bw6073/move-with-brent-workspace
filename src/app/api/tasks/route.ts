// src/app/api/tasks/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/tasks
// - /api/tasks?propertyId=123 => tasks just for that property
// - /api/tasks                => all tasks for current user
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const url = new URL(req.url);
    const propertyIdParam = url.searchParams.get("propertyId");
    const contactIdParam = url.searchParams.get("contactId");

    const numericPropertyId = propertyIdParam ? Number(propertyIdParam) : null;
    const numericContactId = contactIdParam ? Number(contactIdParam) : null;

    let query = supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (numericPropertyId && !Number.isNaN(numericPropertyId)) {
      query = query.eq("related_property_id", numericPropertyId);
    }

    if (numericContactId && !Number.isNaN(numericContactId)) {
      query = query.eq("related_contact_id", numericContactId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/tasks] supabase error", error);
      return NextResponse.json(
        { error: "Failed to load tasks", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: data ?? [] }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/tasks] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

// POST /api/tasks
export async function POST(req: Request) {
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
    task_type,
  } = body ?? {};

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
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

    const insertPayload: any = {
      user_id: user.id,
      title: title.trim(),
      notes:
        typeof notes === "string" && notes.trim().length > 0
          ? notes.trim()
          : null,
      status: typeof status === "string" ? status : "pending",
      priority: typeof priority === "string" ? priority : "normal",
      due_date:
        typeof due_date === "string" || due_date === null ? due_date : null,
    };

    if (typeof related_property_id === "number") {
      insertPayload.related_property_id = related_property_id;
    }

    // This is what the contact tasks will use
    if (typeof related_contact_id === "number") {
      insertPayload.related_contact_id = related_contact_id;
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert(insertPayload)
      .select(
        "id, title, notes, status, priority, task_type, due_date, related_property_id, related_contact_id, created_at"
      )
      .maybeSingle();

    if (error) {
      console.error("[POST /api/tasks] supabase error", error);
      return NextResponse.json(
        { error: "Failed to create task", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ task: data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tasks] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
