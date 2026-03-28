// src/app/api/property-activities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/requireUser";

const ACTIVITY_SELECT = `
  id,
  property_id,
  activity_type,
  direction,
  subject,
  summary,
  outcome,
  channel,
  activity_at,
  created_at,
  updated_at
`;

export async function GET(req: NextRequest) {
  try {
    const { user, supabase, errorResponse } = await requireUser();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const propertyIdParam = searchParams.get("propertyId");

    if (!propertyIdParam) {
      return NextResponse.json({ error: "Missing propertyId" }, { status: 400 });
    }

    const propertyId = Number(propertyIdParam);
    if (Number.isNaN(propertyId)) {
      return NextResponse.json({ error: "Invalid propertyId" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("property_activities")
      .select(ACTIVITY_SELECT)
      .eq("user_id", user.id)
      .eq("property_id", propertyId)
      .order("activity_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[GET /api/property-activities]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (err) {
    console.error("[GET /api/property-activities] unexpected", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase, errorResponse } = await requireUser();
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const propertyId = Number(body.property_id ?? body.propertyId);
    if (!propertyId || Number.isNaN(propertyId)) {
      return NextResponse.json({ error: "Invalid or missing property_id" }, { status: 400 });
    }

    const activity_type = body.activity_type as string;
    if (!activity_type) {
      return NextResponse.json({ error: "Missing activity_type" }, { status: 400 });
    }

    const insert = {
      user_id: user.id,
      property_id: propertyId,
      activity_type,
      direction: body.direction ?? null,
      subject: body.subject ?? null,
      summary: body.summary ?? null,
      outcome: body.outcome ?? null,
      channel: body.channel ?? null,
      activity_at: body.activity_at
        ? new Date(body.activity_at).toISOString()
        : new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("property_activities")
      .insert(insert)
      .select(ACTIVITY_SELECT)
      .single();

    if (error || !data) {
      console.error("[POST /api/property-activities]", error);
      return NextResponse.json({ error: error?.message ?? "Failed to create activity" }, { status: 500 });
    }

    return NextResponse.json({ activity: data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/property-activities] unexpected", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
