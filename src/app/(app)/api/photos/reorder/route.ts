import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const {
      entityType,
      entityId,
      photoIdsInOrder,
    }: {
      entityType?: "property" | "appraisal";
      entityId?: number;
      photoIdsInOrder?: number[];
    } = body;

    if (
      !entityType ||
      !entityId ||
      !Array.isArray(photoIdsInOrder) ||
      photoIdsInOrder.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid payload for reorder" },
        { status: 400 }
      );
    }

    // Update sort_order for each photo id, in order
    // (Small lists, so a simple loop is fine.)
    for (let index = 0; index < photoIdsInOrder.length; index += 1) {
      const photoId = photoIdsInOrder[index];

      const { error } = await supabase
        .from("photos")
        .update({ sort_order: index })
        .eq("id", photoId)
        .eq("user_id", user.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);

      if (error) {
        console.error("Reorder update error", photoId, error.message);
        return NextResponse.json(
          { error: "Failed to update photo order" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Reorder handler error", err);
    return NextResponse.json(
      { error: "Unexpected error while reordering photos" },
      { status: 500 }
    );
  }
}
