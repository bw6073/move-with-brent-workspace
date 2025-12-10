// src/app/api/properties/[id]/timeline/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>; // match your other API routes pattern
};

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const propertyId = Number(id);

  if (!id || Number.isNaN(propertyId)) {
    return NextResponse.json(
      { error: "Invalid property id", rawId: id ?? null },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    // Auth for RLS
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("[timeline] no auth user", userError);
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const userId = user.id;

    // 1) Make sure property exists and belongs to user
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("id, street_address, suburb, created_at")
      .eq("id", propertyId)
      .eq("user_id", userId)
      .maybeSingle();

    if (propError) {
      console.error("[timeline] property error", propError);
      return NextResponse.json(
        { error: "Failed to load property", supabaseError: propError },
        { status: 500 }
      );
    }

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // 2) Load appraisals for this property
    const { data: appraisals, error: apprError } = await supabase
      .from("appraisals")
      .select(
        "id, status, data, created_at, inspection_date, property_id, user_id"
      )
      .eq("property_id", propertyId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (apprError) {
      console.error("[timeline] appraisals error", apprError);
    }

    // 3) Load tasks for this property
    const { data: tasks, error: taskError } = await supabase
      .from("tasks")
      .select(
        "id, title, status, notes, due_date, created_at, related_property_id, user_id"
      )
      .eq("related_property_id", propertyId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (taskError) {
      console.error("[timeline] tasks error", taskError);
    }

    type TimelineItem = {
      id: string;
      type: "property" | "appraisal" | "task";
      date: string | null;
      title: string;
      subtitle?: string | null;
      href?: string | null;
    };

    const events: TimelineItem[] = [];

    // Property created
    if (property.created_at) {
      events.push({
        id: `property-${property.id}-created`,
        type: "property",
        date: property.created_at,
        title: "Property record created",
        subtitle: `${property.street_address ?? "Property"}${
          property.suburb ? `, ${property.suburb}` : ""
        }`,
        href: `/properties/${property.id}`,
      });
    }

    // Appraisal events
    (appraisals ?? []).forEach((row: any) => {
      const d = (row.data ?? {}) as any;
      const title =
        d.appraisalTitle ?? d.appraisal_title ?? "Appraisal created";

      const status = row.status ?? d.status ?? null;

      events.push({
        id: `appraisal-${row.id}`,
        type: "appraisal",
        date: row.created_at ?? row.inspection_date ?? null,
        title,
        subtitle: status ? `Status: ${status}` : null,
        href: `/appraisals/${row.id}/edit`,
      });

      // Optional: you could add another event for inspection_date specifically
      // if (row.inspection_date && row.inspection_date !== row.created_at) { ... }
    });

    // Task events
    (tasks ?? []).forEach((t: any) => {
      events.push({
        id: `task-${t.id}`,
        type: "task",
        date: t.due_date ?? t.created_at ?? null,
        title: t.title ?? "Task",
        subtitle: t.status ? `Status: ${t.status}` : null,
        href: `/tasks/${t.id}`,
      });
    });

    // Sort newest → oldest
    events.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

    return NextResponse.json({ items: events }, { status: 200 });
  } catch (err) {
    console.error("[timeline] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
