// src/app/api/photos/primary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { entityType, entityId, photoId } = await req.json();

  if (!entityType || !entityId || !photoId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Clear existing primary for this appraisal/property
  const { error: clearError } = await supabase
    .from("photos")
    .update({ is_primary: false })
    .eq("entity_type", entityType)
    .eq("entity_id", Number(entityId))
    .eq("user_id", user.id);

  if (clearError) {
    console.error(clearError);
    return NextResponse.json(
      { error: "Failed to clear primary" },
      { status: 500 }
    );
  }

  // Set new primary
  const { error: setError } = await supabase
    .from("photos")
    .update({ is_primary: true })
    .eq("id", Number(photoId))
    .eq("user_id", user.id);

  if (setError) {
    console.error(setError);
    return NextResponse.json(
      { error: "Failed to set primary" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
