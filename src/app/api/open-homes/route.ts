import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const body = await req.json();
  const { propertyId, title, startAt, endAt, notes } = body;

  if (!propertyId || !startAt) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const propertyIdNum = Number(propertyId);
  if (!Number.isFinite(propertyIdNum)) {
    return NextResponse.json(
      { error: "Invalid propertyId", value: propertyId },
      { status: 400 }
    );
  }

  // Convert datetime-local to ISO
  const startDate = new Date(startAt);
  const endDate = endAt ? new Date(endAt) : null;

  const { data, error } = await supabase
    .from("open_home_events")
    .insert({
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
    return NextResponse.json(
      { error: "Insert failed", supabaseError: error },
      { status: 500 }
    );
  }

  return NextResponse.json({ event: data }, { status: 201 });
}
