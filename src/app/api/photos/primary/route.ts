import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_ENTITY_TYPES = new Set(["property", "appraisal"]);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, entityType, entityId } = body as Record<string, unknown>;

  const photoId = Number(id);
  const entId = Number(entityId);

  if (!Number.isFinite(photoId) || photoId <= 0) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (typeof entityType !== "string" || !ALLOWED_ENTITY_TYPES.has(entityType)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!Number.isFinite(entId) || entId <= 0) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // 1) ensure the photo belongs to this user + entity
  const { data: photo, error: photoErr } = await supabase
    .from("photos")
    .select("id")
    .eq("id", photoId)
    .eq("user_id", user.id)
    .eq("entity_type", entityType)
    .eq("entity_id", entId)
    .single();

  if (photoErr || !photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // 2) clear previous primary
  const { error: clearErr } = await supabase
    .from("photos")
    .update({ is_primary: false })
    .eq("user_id", user.id)
    .eq("entity_type", entityType)
    .eq("entity_id", entId);

  if (clearErr) {
    console.error(clearErr);
    return NextResponse.json(
      { error: "Failed to set primary" },
      { status: 500 }
    );
  }

  // 3) set this one as primary
  const { data: updated, error: setErr } = await supabase
    .from("photos")
    .update({ is_primary: true })
    .eq("id", photoId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (setErr) {
    console.error(setErr);
    return NextResponse.json(
      { error: "Failed to set primary" },
      { status: 500 }
    );
  }

  return NextResponse.json({ photo: updated });
}
