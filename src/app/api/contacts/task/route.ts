import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contactIdParam = searchParams.get("contactId");

    if (!contactIdParam) {
      return NextResponse.json(
        { error: "Missing contactId", tasks: [] },
        { status: 400 }
      );
    }

    const contactId = Number(contactIdParam);
    if (!Number.isFinite(contactId) || contactId <= 0) {
      return NextResponse.json(
        { error: "Invalid contactId", tasks: [] },
        { status: 400 }
      );
    }

    const { user, supabase } = await requireUser();

    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        id,
        related_contact_id,
        related_property_id,
        task_type,
        title,
        due_date,
        priority,
        status,
        notes,
        created_at,
        updated_at
      `
      )
      .eq("user_id", user.id)
      .eq("related_contact_id", contactId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[api/contacts/tasks] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to load tasks", tasks: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({ tasks: data ?? [] });
  } catch (err) {
    console.error("[api/contacts/tasks] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected server error", tasks: [] },
      { status: 500 }
    );
  }
}
