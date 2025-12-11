// src/app/api/appraisals/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>; // ✅ Next 16: params is a Promise
};

// ---------- GET /api/appraisals/[id] ----------
export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const rawId = id;
  console.log("[API /api/appraisals/[id] GET] rawId:", rawId);

  const numericId = Number(rawId);

  if (!rawId || Number.isNaN(numericId)) {
    return NextResponse.json(
      {
        error: "Invalid appraisal ID",
        rawId: rawId ?? null,
      },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("appraisals")
      .select("*")
      .eq("id", numericId)
      .maybeSingle();

    if (error) {
      console.error("[API /api/appraisals/[id] GET] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to load appraisal", supabaseError: error },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Appraisal not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ appraisal: data }, { status: 200 });
  } catch (err) {
    console.error("[API /api/appraisals/[id] GET] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

// ---------- PUT /api/appraisals/[id] ----------
export async function PUT(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const rawId = id;
  console.log("[API /api/appraisals/[id] PUT] rawId:", rawId);

  const numericId = Number(rawId);
  if (!rawId || Number.isNaN(numericId)) {
    return NextResponse.json(
      { error: "Invalid appraisal ID", rawId: rawId ?? null },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    data: formData,
    status,
    contactIds,
    property_id,
    propertyId,
  }: {
    data?: any;
    status?: string;
    contactIds?: unknown;
    property_id?: number | null;
    propertyId?: number | null;
  } = body;

  try {
    const supabase = await createClient();

    // Work out which property we should point to
    // 1) explicit property_id
    // 2) propertyId (camel)
    // 3) propertyId inside formData
    const effectivePropertyId: number | null =
      typeof property_id === "number"
        ? property_id
        : typeof propertyId === "number"
        ? propertyId
        : typeof formData?.propertyId === "number"
        ? formData.propertyId
        : null;

    // Merge JSON data so we always keep a propertyId copy inside the blob
    const mergedData = {
      ...(formData ?? {}),
      propertyId: effectivePropertyId ?? formData?.propertyId ?? null,
    };

    // 1) Update main appraisal record
    const { data, error } = await supabase
      .from("appraisals")
      .update({
        data: mergedData,
        status: status ?? "DRAFT",
        property_id: effectivePropertyId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", numericId)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[API /api/appraisals/[id] PUT] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to update appraisal", supabaseError: error },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Appraisal not found after update" },
        { status: 404 }
      );
    }

    // 2) Sync join table for linked contacts (if provided)
    if (Array.isArray(contactIds)) {
      const numericContactIds = contactIds
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n));

      // Clear existing links
      const { error: deleteError } = await supabase
        .from("appraisal_contacts")
        .delete()
        .eq("appraisal_id", numericId);

      if (deleteError) {
        console.error(
          "[API /api/appraisals/[id] PUT] Failed to clear appraisal_contacts",
          deleteError
        );
        // Not fatal for the main save
      }

      if (numericContactIds.length > 0) {
        const rows = numericContactIds.map((cid, index) => ({
          appraisal_id: numericId,
          contact_id: cid,
          role: "owner",
          is_primary: index === 0,
        }));

        const { error: insertError } = await supabase
          .from("appraisal_contacts")
          .insert(rows);

        if (insertError) {
          console.error(
            "[API /api/appraisals/[id] PUT] Failed to insert appraisal_contacts",
            insertError
          );
          // Still return 200 for main appraisal update
        }
      }
    }

    return NextResponse.json({ appraisal: data }, { status: 200 });
  } catch (err) {
    console.error("[API /api/appraisals/[id] PUT] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

// ---------- DELETE /api/appraisals/[id] ----------
export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const rawId = id;
  console.log("[API /api/appraisals/[id] DELETE] rawId:", rawId);

  const numericId = Number(rawId);
  if (!rawId || Number.isNaN(numericId)) {
    return NextResponse.json(
      { error: "Invalid appraisal ID", rawId: rawId ?? null },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    // Clear join table links first
    const { error: deleteLinksError } = await supabase
      .from("appraisal_contacts")
      .delete()
      .eq("appraisal_id", numericId);

    if (deleteLinksError) {
      console.error(
        "[API /api/appraisals/[id] DELETE] Failed to delete links",
        deleteLinksError
      );
      // Not fatal, but logged
    }

    const { error } = await supabase
      .from("appraisals")
      .delete()
      .eq("id", numericId);

    if (error) {
      console.error("[API /api/appraisals/[id] DELETE] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to delete appraisal", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[API /api/appraisals/[id] DELETE] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
