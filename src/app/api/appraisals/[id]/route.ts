// src/app/api/appraisals/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function requireUser(supabase: any) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Not signed in" }, { status: 401 }),
    };
  }

  return { user, response: null };
}

function parseId(id: string) {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

function norm(s: unknown) {
  return String(s ?? "").trim();
}

async function ensurePropertyIdFromAddress(
  supabase: any,
  userId: string,
  input: {
    streetAddress?: unknown;
    suburb?: unknown;
    postcode?: unknown;
    state?: unknown;
    propertyType?: unknown;
  }
): Promise<number | null> {
  const street_address = norm(input.streetAddress);
  const suburb = norm(input.suburb);
  const postcode = norm(input.postcode);
  const state = norm(input.state) || "WA";

  if (!street_address || !suburb) return null;

  const { data: existing, error: findError } = await supabase
    .from("properties")
    .select("id")
    .eq("user_id", userId)
    .ilike("street_address", street_address)
    .ilike("suburb", suburb)
    .eq("state", state)
    .eq("postcode", postcode || null)
    .maybeSingle();

  if (findError)
    console.error("[ensurePropertyIdFromAddress] findError", findError);
  if (existing?.id) return Number(existing.id);

  const insertPayload: Record<string, unknown> = {
    user_id: userId,
    street_address,
    suburb,
    state,
    postcode: postcode || null,
    market_status: "appraisal",
  };

  if (norm(input.propertyType))
    insertPayload.property_type = norm(input.propertyType);

  const { data: created, error: createError } = await supabase
    .from("properties")
    .insert(insertPayload)
    .select("id")
    .single();

  if (createError) {
    console.error("[ensurePropertyIdFromAddress] createError", createError);
    return null;
  }

  return created?.id ? Number(created.id) : null;
}

// ---------- GET ----------
export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const appraisalId = parseId(id);

  if (!appraisalId) {
    return NextResponse.json(
      { error: "Invalid appraisal ID" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (response) return response;

  const { data, error } = await supabase
    .from("appraisals")
    .select("*")
    .eq("id", appraisalId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[GET /api/appraisals/[id]]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Appraisal not found" }, { status: 404 });
  }

  return NextResponse.json({ appraisal: data }, { status: 200 });
}

// ---------- PUT ----------
export async function PUT(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const appraisalId = parseId(id);

  if (!appraisalId) {
    return NextResponse.json(
      { error: "Invalid appraisal ID" },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (response) return response;

  const {
    data: formData,
    status,
    contactIds,
    property_id,
    propertyId,
  } = body ?? {};

  // Decide property id:
  // - if explicitly provided: validate it belongs to this user
  // - else: auto link/create from address inside the form data
  let effectivePropertyId: number | null =
    typeof property_id === "number"
      ? property_id
      : typeof propertyId === "number"
      ? propertyId
      : typeof formData?.propertyId === "number"
      ? formData.propertyId
      : null;

  if (effectivePropertyId) {
    const { data: p, error: pErr } = await supabase
      .from("properties")
      .select("id")
      .eq("id", effectivePropertyId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (pErr || !p) {
      return NextResponse.json(
        { error: "Invalid property_id for this user" },
        { status: 400 }
      );
    }
  } else {
    effectivePropertyId = await ensurePropertyIdFromAddress(supabase, user.id, {
      streetAddress: formData?.streetAddress,
      suburb: formData?.suburb,
      postcode: formData?.postcode,
      state: formData?.state,
      propertyType: formData?.propertyType,
    });
  }

  const mergedData = {
    ...(formData ?? {}),
    propertyId: effectivePropertyId ?? null,
  };

  const { data, error } = await supabase
    .from("appraisals")
    .update({
      data: mergedData,
      status: status ?? "DRAFT",
      property_id: effectivePropertyId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appraisalId)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[PUT /api/appraisals/[id]]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Appraisal not found" }, { status: 404 });
  }

  // Sync join table for linked contacts (if provided)
  if (Array.isArray(contactIds)) {
    const numericContactIds = contactIds
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n));

    // clear
    const { error: deleteError } = await supabase
      .from("appraisal_contacts")
      .delete()
      .eq("appraisal_id", appraisalId);

    if (deleteError) {
      console.error("[PUT appraisal_contacts delete]", deleteError);
      // not fatal
    }

    if (numericContactIds.length > 0) {
      const rows = numericContactIds.map((cid, index) => ({
        appraisal_id: appraisalId,
        contact_id: cid,
        role: "owner",
        is_primary: index === 0,
      }));

      const { error: insertError } = await supabase
        .from("appraisal_contacts")
        .insert(rows);

      if (insertError) {
        console.error("[PUT appraisal_contacts insert]", insertError);
        // not fatal
      }
    }
  }

  return NextResponse.json({ appraisal: data }, { status: 200 });
}

// ---------- DELETE ----------
export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const appraisalId = parseId(id);

  if (!appraisalId) {
    return NextResponse.json(
      { error: "Invalid appraisal ID" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (response) return response;

  // Clear join links first
  const { error: deleteLinksError } = await supabase
    .from("appraisal_contacts")
    .delete()
    .eq("appraisal_id", appraisalId);

  if (deleteLinksError) {
    console.error("[DELETE appraisal_contacts]", deleteLinksError);
    // not fatal
  }

  const { error } = await supabase
    .from("appraisals")
    .delete()
    .eq("id", appraisalId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[DELETE /api/appraisals/[id]]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
