// src/app/api/attachments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "Missing entityType or entityId" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", Number(entityId))
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

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();

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
  } = body;

  if (!entityType || !entityId || !bucket || !storagePath || !fileName) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("attachments")
    .insert({
      user_id: user.id,
      entity_type: entityType,
      entity_id: Number(entityId),
      bucket,
      storage_path: storagePath,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      is_image: !!isImage,
      description: description ?? null,
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
