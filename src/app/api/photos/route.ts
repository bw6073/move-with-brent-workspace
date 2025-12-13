import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_ENTITY_TYPES = new Set(["property", "appraisal"]);

function parseEntity(searchParams: URLSearchParams) {
  const entityType = searchParams.get("entityType")?.trim();
  const entityIdRaw = searchParams.get("entityId")?.trim();

  if (!entityType || !entityIdRaw) {
    return { error: "Missing entityType or entityId" as const };
  }

  if (!ALLOWED_ENTITY_TYPES.has(entityType)) {
    return { error: "Invalid entityType" as const };
  }

  const entityId = Number(entityIdRaw);
  if (!Number.isFinite(entityId) || entityId <= 0) {
    return { error: "Invalid entityId" as const };
  }

  return { entityType, entityId } as const;
}

/* GET photos */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const parsed = parseEntity(searchParams);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("user_id", user.id)
    .eq("entity_type", parsed.entityType)
    .eq("entity_id", parsed.entityId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load photos" },
      { status: 500 }
    );
  }

  return NextResponse.json({ photos: data ?? [] });
}

/* POST photo */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    entityType,
    entityId,
    bucket,
    storagePath,
    sortOrder,
    caption,
    areaLabel,
  } = body as Record<string, unknown>;

  if (typeof entityType !== "string" || !ALLOWED_ENTITY_TYPES.has(entityType)) {
    return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
  }

  const entityIdNum = Number(entityId);
  if (!Number.isFinite(entityIdNum) || entityIdNum <= 0) {
    return NextResponse.json({ error: "Invalid entityId" }, { status: 400 });
  }

  if (typeof bucket !== "string" || typeof storagePath !== "string") {
    return NextResponse.json(
      { error: "Missing bucket or storagePath" },
      { status: 400 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("photos")
    .insert({
      user_id: user.id,
      entity_type: entityType,
      entity_id: entityIdNum,
      bucket,
      storage_path: storagePath,
      sort_order: typeof sortOrder === "number" ? sortOrder : 0,
      caption: typeof caption === "string" ? caption : null,
      area_label: typeof areaLabel === "string" ? areaLabel : "General",
    })
    .select("*")
    .single();

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to save photo" },
      { status: 500 }
    );
  }

  return NextResponse.json({ photo: data }, { status: 201 });
}
