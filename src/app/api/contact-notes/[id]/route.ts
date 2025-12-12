// src/app/api/contact-notes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const supabase = await createClient();

  // Next.js 15/16: params is a Promise
  const { id } = await context.params;
  console.log("DELETE contact note:", id);

  const noteId = Number(id);
  if (Number.isNaN(noteId)) {
    return NextResponse.json({ error: "Invalid noteId" }, { status: 400 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Auth error in contact-note DELETE", authError);
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { error } = await supabase
    .from("contact_notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error deleting contact note", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete note" },
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
