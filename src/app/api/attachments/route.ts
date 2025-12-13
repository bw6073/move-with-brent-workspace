import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_ENTITY_TYPES = new Set([
  "contact",
  "appraisal",
  "property",
  "task",
]);

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

/* GET attachments */
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
    .from("attachments")
    .select("*")
    .eq("user_id", user.id)
    .eq("entity_type", parsed.entityType)
    .eq("entity_id", parsed.entityId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load attachments" },
      { status: 500 }
    );
  }

  return NextResponse.json({ attachments: data ?? [] });
}

/* POST attachment */
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
    fileName,
    fileType,
    fileSize,
    isImage,
    description,
  } = body as Record<string, unknown>;

  if (typeof entityType !== "string" || !ALLOWED_ENTITY_TYPES.has(entityType)) {
    return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
  }

  const entityIdNum = Number(entityId);
  if (!Number.isFinite(entityIdNum) || entityIdNum <= 0) {
    return NextResponse.json({ error: "Invalid entityId" }, { status: 400 });
  }

  if (
    typeof bucket !== "string" ||
    typeof storagePath !== "string" ||
    typeof fileName !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
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
    .from("attachments")
    .insert({
      user_id: user.id,
      entity_type: entityType,
      entity_id: entityIdNum,
      bucket,
      storage_path: storagePath,
      file_name: fileName,
      file_type: typeof fileType === "string" ? fileType : null,
      file_size: typeof fileSize === "number" ? fileSize : null,
      is_image: Boolean(isImage),
      description: typeof description === "string" ? description : null,
    })
    .select("*")
    .single();

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to save attachment" },
      { status: 500 }
    );
  }

  return NextResponse.json({ attachment: data }, { status: 201 });
}
