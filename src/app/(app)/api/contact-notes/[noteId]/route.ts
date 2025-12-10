import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ noteId: string }>;
};

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { noteId } = await context.params;
    const id = Number(noteId);

    if (!noteId || Number.isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid note ID", rawId: noteId ?? null },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("DELETE /contact-notes/[noteId] – unauthorised", userError);
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { error } = await supabase
      .from("contact_notes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "DELETE /contact-notes/[noteId] – Supabase error",
        JSON.stringify(error, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to delete note", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /contact-notes/[noteId] – unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
