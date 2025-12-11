// src/app/api/contact-activities/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>; // Next 16: params is a Promise
};

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const activityId = Number(id);

    if (!id || Number.isNaN(activityId)) {
      return NextResponse.json(
        { error: "Invalid activity ID", rawId: id ?? null },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "No authenticated user in DELETE /contact-activities/[id]",
        userError
      );
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { error } = await supabase
      .from("contact_activities")
      .delete()
      .eq("id", activityId)
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "Failed to delete contact activity",
        JSON.stringify(error, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to delete activity", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error in DELETE /contact-activities/[id]", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
