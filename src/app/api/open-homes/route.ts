// app/api/open-homes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/requireUser";
import { OpenHomeCreateSchema } from "@/lib/schemas/openHome";

export async function POST(req: NextRequest) {
  const { user, supabase, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = OpenHomeCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { propertyId, title, startAt, endAt, notes } = body;
  const propertyIdNum = Number(propertyId);

  const startDate = new Date(startAt);
  const endDate = endAt ? new Date(endAt) : null;

  const { data, error } = await supabase
    .from("open_home_events")
    .insert({
      user_id: user.id,
      property_id: propertyIdNum,
      title: title?.trim() || null,
      start_at: startDate.toISOString(),
      end_at: endDate ? endDate.toISOString() : null,
      notes: notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error inserting open_home_event", error);
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ event: data }, { status: 201 });
}
