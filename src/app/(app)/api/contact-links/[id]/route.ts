// src/app/api/contact-links/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const numericId = Number(id);

  if (!id || Number.isNaN(numericId)) {
    return NextResponse.json(
      { error: "Invalid link ID", rawId: id ?? null },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { error } = await supabase
      .from("contact_links")
      .delete()
      .eq("id", numericId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[DELETE /api/contact-links/[id]] supabase error", error);
      return NextResponse.json(
        { error: "Failed to delete link", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/contact-links/[id]] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
