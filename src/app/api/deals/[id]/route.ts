// src/app/api/deals/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function parseId(id: string) {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

async function requireUser(supabase: any) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return {
      user: null,
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Not signed in" }, { status: 401 }),
    };
  }

  return { user, response: null as NextResponse | null };
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

  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (response) return response;

  const { data, error } = await supabase
    .from("deals")
    .select(DEAL_SELECT)
    .eq("id", dealId)
    .eq("user_id", user!.id)
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

  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (response) return response;

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

  const { data, error } = await supabase
    .from("deals")
    .update(updates)
    .eq("id", dealId)
    .eq("user_id", user!.id)
    .select(DEAL_SELECT)
    .single();

  if (error) {
    console.error("Error updating deal", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  return NextResponse.json({ deal: data });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const dealId = parseId(id);

  if (!dealId) {
    return NextResponse.json({ error: "Invalid deal ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (response) return response;

  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("id", dealId)
    .eq("user_id", user!.id);

  if (error) {
    console.error("Error deleting deal", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
