// src/app/api/photos/route.ts
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
    .from("photos")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", Number(entityId))
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

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();

  const {
    entityType,
    entityId,
    bucket,
    storagePath,
    sortOrder,
    caption,
    areaLabel,
  } = body;

  if (!entityType || !entityId || !bucket || !storagePath) {
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
    .from("photos")
    .insert({
      user_id: user.id,
      entity_type: entityType,
      entity_id: Number(entityId),
      bucket,
      storage_path: storagePath,
      sort_order: sortOrder ?? 0,
      caption: caption ?? null,
      area_label: areaLabel ?? "General",
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
