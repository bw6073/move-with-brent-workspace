// src/app/api/deals/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/requireUser";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function parseId(id: string) {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

const DEAL_SELECT = `
  *,
  contacts:contact_id (
    id,
    first_name,
    last_name,
    phone_mobile,
    email
  ),
  properties:property_id (
    id,
    street_address,
    suburb,
    state,
    postcode
  ),
  appraisals:appraisal_id (
    id,
    status,
    created_at,
    updated_at,
    data
  )
`;

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const dealId = parseId(id);

  if (!dealId) {
    return NextResponse.json({ error: "Invalid deal ID" }, { status: 400 });
  }

  const { user, supabase, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("deals")
    .select(DEAL_SELECT)
    .eq("id", dealId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error loading deal", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  return NextResponse.json({ deal: data });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const dealId = parseId(id);

  if (!dealId) {
    return NextResponse.json({ error: "Invalid deal ID" }, { status: 400 });
  }

  const { user, supabase, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const payload = (await req.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const allowed = [
    "title",
    "stage",
    "contact_id",
    "property_id",
    "appraisal_id",
    "estimated_value_low",
    "estimated_value_high",
    "confidence",
    "next_action_at",
    "lost_reason",
    "notes",
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (payload[key] !== undefined) updates[key] = payload[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  // Load current stage before update so we can detect stage transitions
  const { data: currentDeal } = await supabase
    .from("deals")
    .select("stage, property_id, contact_id, title")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .single();

  const { data, error } = await supabase
    .from("deals")
    .update(updates)
    .eq("id", dealId)
    .eq("user_id", user.id)
    .select(DEAL_SELECT)
    .single();

  if (error) {
    console.error("Error updating deal", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Auto-create tasks on stage transitions
  const newStage = updates.stage as string | undefined;
  const prevStage = currentDeal?.stage as string | undefined;
  if (newStage && newStage !== prevStage) {
    const dealLabel = currentDeal?.title ?? `Deal #${dealId}`;
    const autoTasks: { title: string; days: number; priority: string }[] = [];

    if (newStage === "under_offer") {
      autoTasks.push(
        { title: `${dealLabel} – Confirm contract exchange`, days: 1, priority: "high" },
        { title: `${dealLabel} – Notify all parties`, days: 1, priority: "high" },
        { title: `${dealLabel} – Arrange building & pest inspection`, days: 5, priority: "normal" },
        { title: `${dealLabel} – Follow up finance approval`, days: 14, priority: "normal" },
      );
    } else if (newStage === "sold") {
      autoTasks.push(
        { title: `${dealLabel} – Confirm settlement date`, days: 1, priority: "high" },
        { title: `${dealLabel} – Prepare settlement documents`, days: 7, priority: "high" },
        { title: `${dealLabel} – Arrange final inspection`, days: 14, priority: "normal" },
        { title: `${dealLabel} – Send sold announcement to database`, days: 2, priority: "normal" },
        { title: `${dealLabel} – Request vendor/buyer testimonial`, days: 30, priority: "low" },
      );
    }

    if (autoTasks.length > 0) {
      const now = new Date();
      const taskInserts = autoTasks.map((t) => {
        const due = new Date(now);
        due.setDate(due.getDate() + t.days);
        return {
          user_id: user.id,
          title: t.title,
          status: "pending",
          priority: t.priority,
          related_property_id: currentDeal?.property_id ?? null,
          related_contact_id: currentDeal?.contact_id ?? null,
          due_date: due.toISOString().slice(0, 10),
        };
      });
      await supabase.from("tasks").insert(taskInserts);
    }
  }

  return NextResponse.json({ deal: data });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const dealId = parseId(id);

  if (!dealId) {
    return NextResponse.json({ error: "Invalid deal ID" }, { status: 400 });
  }

  const { user, supabase, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const { error } = await supabase
    .from("deals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", dealId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting deal", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
