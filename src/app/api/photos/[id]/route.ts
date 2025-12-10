// src/app/api/photos/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();

  // Get the last segment of the URL path as the id
  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const idString = segments[segments.length - 1];

  if (!idString) {
    return NextResponse.json({ error: "Missing photo id" }, { status: 400 });
  }

  const photoId = Number(idString);
  if (!Number.isFinite(photoId)) {
    return NextResponse.json({ error: "Invalid photo id" }, { status: 400 });
  }

  // If you want to enforce user ownership later, we can add checks.
  // For now, just delete.

  // Fetch the photo: need bucket + storage_path
  const { data: photo, error: fetchError } = await supabase
    .from("photos")
    .select("id, bucket, storage_path")
    .eq("id", photoId)
    .single();

  if (fetchError || !photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(photo.bucket)
    .remove([photo.storage_path]);

  if (storageError) {
    console.error("Storage delete error", storageError);
    // still attempt DB delete
  }

  // Delete DB row
  const { error: deleteError } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId);

  if (deleteError) {
    console.error("DB delete error", deleteError);
    return NextResponse.json(
      { error: "Failed to delete photo record" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
