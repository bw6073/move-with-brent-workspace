// src/app/api/appraisals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Authed = { user: { id: string } };

async function requireUser(
  supabase: any
): Promise<
  | { user: { id: string }; response: null }
  | { user: null; response: NextResponse }
> {
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

  return { user: { id: user.id }, response: null };
}

function norm(s: unknown) {
  return String(s ?? "").trim();
}

function isNonEmpty(s: unknown) {
  return norm(s).length > 0;
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

  // Only create/link a property if we actually have an address to work with
  if (!street_address || !suburb) return null;

  // 1) Try find existing (same user)
  const { data: existing, error: findError } = await supabase
    .from("properties")
    .select("id")
    .eq("user_id", userId)
    .ilike("street_address", street_address)
    .ilike("suburb", suburb)
    .eq("state", state)
    .eq("postcode", postcode || null)
    .maybeSingle();

  if (findError) {
    // Don’t hard-fail appraisal save if property lookup fails — log and continue
    console.error("[ensurePropertyIdFromAddress] findError", findError);
  }

  if (existing?.id) return Number(existing.id);

  // 2) Create new property
  const insertPayload: Record<string, unknown> = {
    user_id: userId,
    street_address,
    suburb,
    state,
    postcode: postcode || null,
    market_status: "appraisal",
  };

  // optional: if you’re capturing property type in the form
  if (isNonEmpty(input.propertyType)) {
    insertPayload.property_type = norm(input.propertyType);
  }

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

// ─────────────────────────────────────────────
// GET – list appraisals (optional filters)
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const contactIdParam = searchParams.get("contactId");
  const propertyIdParam = searchParams.get("propertyId");

  // 1) CONTACT-SPECIFIC
  if (contactIdParam) {
    const contactId = Number(contactIdParam);
    if (!Number.isFinite(contactId)) {
      return NextResponse.json({ error: "Invalid contactId" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("appraisal_contacts")
      .select(
        `
          appraisal_id,
          appraisals (*)
        `
      )
      .eq("contact_id", contactId)
      // scope the joined appraisal rows to this user
      .eq("appraisals.user_id", user.id);

    if (error) {
      console.error("Failed to load appraisals for contact", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items =
      (data ?? [])
        .map((row: any) => row.appraisals)
        .filter(Boolean)
        .map((row: any) => {
          const d = (row.data ?? {}) as any;
          return {
            id: row.id,
            appraisalTitle: d.appraisalTitle ?? d.appraisal_title ?? null,
            streetAddress: d.streetAddress ?? d.street_address ?? null,
            suburb: d.suburb ?? null,
            status: row.status ?? d.status ?? null,
            created_at: row.created_at ?? null,
            property_id: row.property_id ?? null,
          };
        }) ?? [];

    return NextResponse.json({ items });
  }

  // 2) PROPERTY-SPECIFIC
  if (propertyIdParam) {
    const propertyId = Number(propertyIdParam);
    if (!Number.isFinite(propertyId)) {
      return NextResponse.json(
        { error: "Invalid propertyId" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("appraisals")
      .select("*")
      .eq("user_id", user.id)
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load appraisals for property", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items =
      (data ?? []).map((row: any) => {
        const d = (row.data ?? {}) as any;
        return {
          id: row.id,
          appraisalTitle: d.appraisalTitle ?? d.appraisal_title ?? null,
          streetAddress: d.streetAddress ?? d.street_address ?? null,
          suburb: d.suburb ?? null,
          status: row.status ?? d.status ?? null,
          created_at: row.created_at ?? null,
          property_id: row.property_id ?? null,
        };
      }) ?? [];

    return NextResponse.json({ items });
  }

  // 3) GENERAL LIST
  const { data, error } = await supabase
    .from("appraisals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load appraisals", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items =
    (data ?? []).map((row: any) => {
      const d = (row.data ?? {}) as any;
      return {
        id: row.id,
        appraisalTitle: d.appraisalTitle ?? d.appraisal_title ?? null,
        streetAddress: d.streetAddress ?? d.street_address ?? null,
        suburb: d.suburb ?? null,
        status: row.status ?? d.status ?? null,
        created_at: row.created_at ?? null,
        property_id: row.property_id ?? null,
      };
    }) ?? [];

  return NextResponse.json({ items });
}

// ─────────────────────────────────────────────
// POST – create appraisal (auto link/create property)
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { user, response } = await requireUser(supabase);
    if (response) return response;

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      status,
      appraisalTitle,
      streetAddress,
      suburb,
      postcode,
      state,
      data,
      contactIds,
      property_id,
      propertyId,
    } = body;

    if (!streetAddress || !suburb || !postcode) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          message: "streetAddress, suburb and postcode are required",
        },
        { status: 400 }
      );
    }

    // If client provided a property id, prefer it.
    // Otherwise: auto find-or-create from address
    let effectivePropertyId: number | null =
      typeof property_id === "number"
        ? property_id
        : typeof propertyId === "number"
        ? propertyId
        : typeof data?.propertyId === "number"
        ? data.propertyId
        : null;

    if (!effectivePropertyId) {
      effectivePropertyId = await ensurePropertyIdFromAddress(
        supabase,
        user.id,
        {
          streetAddress,
          suburb,
          postcode,
          state,
          propertyType: data?.propertyType,
        }
      );
    } else {
      // Optional safety: ensure that property belongs to this user
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
    }

    const insertPayload = {
      user_id: user.id,
      status: status ?? "DRAFT",
      property_id: effectivePropertyId,
      data: {
        ...(data ?? {}),
        appraisalTitle: appraisalTitle ?? data?.appraisalTitle ?? null,
        streetAddress,
        suburb,
        postcode,
        state: state ?? "WA",
        propertyId: effectivePropertyId ?? null,
      },
    };

    const { data: inserted, error: insertError } = await supabase
      .from("appraisals")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError || !inserted) {
      console.error("[POST /api/appraisals] insertError", insertError);
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to create appraisal" },
        { status: 500 }
      );
    }

    const appraisalId = Number(inserted.id);

    // Link contacts (optional)
    const contactIdsSafe: number[] = Array.isArray(contactIds)
      ? contactIds.map((v: any) => Number(v)).filter((n) => Number.isFinite(n))
      : [];

    if (contactIdsSafe.length > 0) {
      const rows = contactIdsSafe.map((cid, index) => ({
        appraisal_id: appraisalId,
        contact_id: cid,
        role: "owner",
        is_primary: index === 0,
      }));

      const { error: linkError } = await supabase
        .from("appraisal_contacts")
        .insert(rows);

      if (linkError) {
        console.error("[POST /api/appraisals] contact link error", linkError);
        // not fatal
      }
    }

    return NextResponse.json({ appraisal: inserted }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/appraisals] Unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
