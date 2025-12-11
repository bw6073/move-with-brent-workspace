// src/app/api/contact-tasks/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || !body.contact_id) {
      return NextResponse.json(
        { error: "Missing contact_id" },
        { status: 400 }
      );
    }

    const contactId = Number(body.contact_id);
    if (!Number.isFinite(contactId)) {
      return NextResponse.json(
        { error: "Invalid contact_id" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const payload = {
      user_id: user.id,
      title: (body.title ?? "").toString().trim(),
      notes: body.notes ?? null,
      status: body.status ?? "pending",
      priority: body.priority ?? "normal",
      task_type: body.task_type ?? "general",
      due_date: body.due_date ?? null, // ISO string or null
      related_contact_id: contactId,
      related_property_id: null,
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("Failed to create contact-linked task:", error);
      return NextResponse.json(
        { error: "Failed to create task", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ task: data });
  } catch (err) {
    console.error("Unexpected error in POST /api/contact-tasks:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
