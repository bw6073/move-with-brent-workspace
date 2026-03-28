// src/app/api/appraisals/[id]/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/requireUser";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AppraisalRow = {
  id: number;
  user_id: string;
  status: string | null;
  property_id: number | null;
  google_event_id: string | null;
  data: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

type PropertyLookupInput = {
  streetAddress?: unknown;
  suburb?: unknown;
  postcode?: unknown;
  state?: unknown;
  propertyType?: unknown;
};

function parseId(id: string) {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

function norm(v: unknown) {
  return String(v ?? "").trim();
}

function toFiniteNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(String(v));
  return Number.isFinite(n) ? n : null;
}

function getGoogleEventIdFromPayload(payload: any): string | null {
  const v = payload?.google_event_id ?? payload?.googleEventId;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function wantsClearGoogleEventId(payload: any): boolean {
  const v1 = payload?.google_event_id;
  const v2 = payload?.googleEventId;
  return v1 === null || v2 === null || v1 === "" || v2 === "";
}

async function ensurePropertyIdFromAddress(
  supabase: any,
  userId: string,
  input: PropertyLookupInput
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

  const property_type = norm(input.propertyType);
  if (property_type) insertPayload.property_type = property_type;

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

async function validatePropertyIdBelongsToUser(
  supabase: any,
  userId: string,
  propertyId: number
) {
  const { data: p, error: pErr } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (pErr || !p) {
    return NextResponse.json(
      { error: "Invalid property_id for this user" },
      { status: 400 }
    );
  }

  return null;
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

  const { user, supabase, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("appraisals")
    .select(
      "id, user_id, status, property_id, google_event_id, data, created_at, updated_at"
    )
    .eq("id", appraisalId)
    .eq("user_id", user.id)
    .maybeSingle<AppraisalRow>();

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

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { user, supabase, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const formData = (body as any)?.data ?? null;
  const status = (body as any)?.status ?? "DRAFT";
  const contactIds = (body as any)?.contactIds;

  // Decide property id (explicit -> validate; else derive from address)
  const explicitPropertyId =
    toFiniteNumber((body as any)?.property_id) ??
    toFiniteNumber((body as any)?.propertyId) ??
    toFiniteNumber(formData?.propertyId);

  let effectivePropertyId: number | null = explicitPropertyId;

  if (effectivePropertyId) {
    const bad = await validatePropertyIdBelongsToUser(
      supabase,
      user.id,
      effectivePropertyId
    );
    if (bad) return bad;
  } else {
    effectivePropertyId = await ensurePropertyIdFromAddress(supabase, user.id, {
      streetAddress: formData?.streetAddress,
      suburb: formData?.suburb,
      postcode: formData?.postcode,
      state: formData?.state,
      propertyType: formData?.propertyType,
    });
  }

  const mergedData: Record<string, any> = {
    ...(formData ?? {}),
    propertyId: effectivePropertyId ?? null,
  };

  const updatePayload: Record<string, any> = {
    data: mergedData,
    status,
    property_id: effectivePropertyId,
    updated_at: new Date().toISOString(),
  };

  // google_event_id updates are opt-in only
  if (wantsClearGoogleEventId(body)) {
    updatePayload.google_event_id = null;
  } else {
    const gid = getGoogleEventIdFromPayload(body);
    if (gid) updatePayload.google_event_id = gid;
  }

  const { data, error } = await supabase
    .from("appraisals")
    .update(updatePayload)
    .eq("id", appraisalId)
    .eq("user_id", user.id)
    .select(
      "id, user_id, status, property_id, google_event_id, data, created_at, updated_at"
    )
    .maybeSingle<AppraisalRow>();

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
      .map((v: any) => Number(v))
      .filter((n: number) => Number.isFinite(n));

    const { error: deleteError } = await supabase
      .from("appraisal_contacts")
      .delete()
      .eq("appraisal_id", appraisalId);

    if (deleteError)
      console.error("[PUT appraisal_contacts delete]", deleteError);

    if (numericContactIds.length > 0) {
      const rows = numericContactIds.map((cid: number, index: number) => ({
        appraisal_id: appraisalId,
        contact_id: cid,
        role: "owner",
        is_primary: index === 0,
      }));

      const { error: insertError } = await supabase
        .from("appraisal_contacts")
        .insert(rows);

      if (insertError)
        console.error("[PUT appraisal_contacts insert]", insertError);
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

  const { user, supabase, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const { error: deleteLinksError } = await supabase
    .from("appraisal_contacts")
    .delete()
    .eq("appraisal_id", appraisalId);

  if (deleteLinksError) {
    console.error("[DELETE appraisal_contacts]", deleteLinksError);
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
