import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  try {
    // Handle both plain object and Promise (Next 16 sometimes wraps params)
    const params =
      "then" in context.params ? await context.params : context.params;

    const idParam = params.id;

    const contactId = Number(idParam);
    if (!Number.isFinite(contactId) || contactId <= 0) {
      return NextResponse.json(
        { error: "Invalid contact id", tasks: [] },
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
      console.error("[api/contacts/[id]/tasks] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to load tasks", tasks: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({ tasks: data ?? [] });
  } catch (err) {
    console.error("[api/contacts/[id]/tasks] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected server error", tasks: [] },
      { status: 500 }
    );
  }
}
