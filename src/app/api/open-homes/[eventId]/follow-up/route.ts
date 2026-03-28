// src/app/api/open-homes/[eventId]/follow-up/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/requireUser";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;
    const { user, supabase, errorResponse } = await requireUser();
    if (errorResponse) return errorResponse;

    // Load the event + property address for the task title
    const { data: event } = await supabase
      .from("open_home_events")
      .select("id, property_id, start_at, title")
      .eq("id", eventId)
      .eq("user_id", user.id)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { data: property } = await supabase
      .from("properties")
      .select("street_address, suburb")
      .eq("id", event.property_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const propertyLabel = property
      ? [property.street_address, property.suburb].filter(Boolean).join(", ")
      : `property #${event.property_id}`;

    // Load attendees that are linked to a contact
    const { data: attendees } = await supabase
      .from("open_home_attendees")
      .select("id, first_name, last_name, contact_id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .not("contact_id", "is", null);

    if (!attendees || attendees.length === 0) {
      return NextResponse.json({
        created: 0,
        message: "No attendees are linked to contacts yet. Convert attendees to contacts first.",
      });
    }

    // Due date = tomorrow
    const due = new Date();
    due.setDate(due.getDate() + 1);
    const dueDate = due.toISOString().split("T")[0];

    const tasks = attendees.map((a) => ({
      user_id: user.id,
      contact_id: a.contact_id,
      title: `Follow up — ${a.first_name} ${a.last_name} (open home at ${propertyLabel})`,
      status: "pending",
      priority: "high",
      due_date: dueDate,
    }));

    const { data: inserted, error } = await supabase
      .from("tasks")
      .insert(tasks)
      .select("id");

    if (error) {
      console.error("[follow-up] insert error", error);
      return NextResponse.json({ error: "Failed to create tasks" }, { status: 500 });
    }

    return NextResponse.json({ created: inserted?.length ?? 0 });
  } catch (err) {
    console.error("[follow-up] unexpected error", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
