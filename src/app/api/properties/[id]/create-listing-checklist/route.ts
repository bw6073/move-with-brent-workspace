// src/app/api/properties/[id]/create-listing-checklist/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/requireUser";

const LISTING_TASKS = [
  { title: "Book professional photographer", task_type: "marketing", days: 3 },
  { title: "Order floor plan / site plan", task_type: "marketing", days: 3 },
  { title: "Write marketing copy / property description", task_type: "marketing", days: 5 },
  { title: "Install signboard", task_type: "admin", days: 2 },
  { title: "Upload listing to realestate.com.au & Domain", task_type: "marketing", days: 5 },
  { title: "Create property brochure / printouts", task_type: "marketing", days: 7 },
  { title: "Set up open home schedule", task_type: "admin", days: 3 },
  { title: "Send listing announcement to buyers database", task_type: "followup", days: 5 },
  { title: "Complete Form 6 / agency agreement", task_type: "admin", days: 1 },
  { title: "Obtain property title & council rates", task_type: "admin", days: 7 },
];

type Params = { id: string };

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { user, supabase, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const propertyId = Number(id);
  if (Number.isNaN(propertyId)) {
    return NextResponse.json({ error: "Invalid property id" }, { status: 400 });
  }

  // Verify property belongs to user
  const { data: prop, error: propError } = await supabase
    .from("properties")
    .select("id, street_address, suburb")
    .eq("id", propertyId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (propError || !prop) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const now = new Date();
  const inserts = LISTING_TASKS.map((task) => {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + task.days);
    return {
      user_id: user.id,
      title: task.title,
      task_type: task.task_type,
      status: "pending",
      priority: "normal",
      related_property_id: propertyId,
      due_date: dueDate.toISOString().slice(0, 10),
    };
  });

  const { data, error } = await supabase
    .from("tasks")
    .insert(inserts)
    .select("id");

  if (error) {
    console.error("[create-listing-checklist] insert error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ created: data?.length ?? 0 }, { status: 201 });
}
