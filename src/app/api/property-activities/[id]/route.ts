// src/app/api/property-activities/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/requireUser";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const activityId = Number(id);

    if (!id || Number.isNaN(activityId)) {
      return NextResponse.json({ error: "Invalid activity ID" }, { status: 400 });
    }

    const { user, supabase, errorResponse } = await requireUser();
    if (errorResponse) return errorResponse;

    const { error } = await supabase
      .from("property_activities")
      .delete()
      .eq("id", activityId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[DELETE /api/property-activities/[id]]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/property-activities/[id]] unexpected", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
