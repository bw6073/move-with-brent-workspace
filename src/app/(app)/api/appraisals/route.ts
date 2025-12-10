import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const contactIdParam = searchParams.get("contactId");
  const propertyIdParam = searchParams.get("propertyId");

  // ─────────────────────────────────────────────
  // 1) CONTACT-SPECIFIC APPRAISALS
  //    /api/appraisals?contactId=123
  // ─────────────────────────────────────────────
  if (contactIdParam) {
    const contactId = Number(contactIdParam);
    if (Number.isNaN(contactId)) {
      return NextResponse.json({ error: "Invalid contactId" }, { status: 400 });
    }

    // Join via appraisal_contacts → appraisals
    const { data, error } = await supabase
      .from("appraisal_contacts")
      .select(
        `
          appraisal_id,
          appraisals (*)
        `
      )
      .eq("contact_id", contactId);

    if (error) {
      console.error(
        "Failed to load appraisals for contact",
        JSON.stringify(error, null, 2)
      );
      return NextResponse.json(
        {
          error: "supabase_error",
          message: error.message,
          code: error.code,
        },
        { status: 500 }
      );
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

  // ─────────────────────────────────────────────
  // 2) PROPERTY-SPECIFIC APPRAISALS
  //    /api/appraisals?propertyId=45
  //    (handy if we want to use the API instead of
  //     calling Supabase directly in the side panel)
  // ─────────────────────────────────────────────
  if (propertyIdParam) {
    const propertyId = Number(propertyIdParam);
    if (Number.isNaN(propertyId)) {
      return NextResponse.json(
        { error: "Invalid propertyId" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("appraisals")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "Failed to load appraisals for property",
        JSON.stringify(error, null, 2)
      );
      return NextResponse.json(
        {
          error: "supabase_error",
          message: error.message,
          code: error.code,
        },
        { status: 500 }
      );
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
  // 3) GENERAL APPRAISALS LIST (no filters)
  // ─────────────────────────────────────────────
  const { data, error } = await supabase
    .from("appraisals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load appraisals", JSON.stringify(error, null, 2));
    return NextResponse.json(
      {
        error: "supabase_error",
        message: error.message,
        code: error.code,
      },
      { status: 500 }
    );
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
// POST – CREATE NEW APPRAISAL
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth – required so RLS on appraisals works
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("[POST /api/appraisals] No authenticated user", userError);
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

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

    // Decide which property_id to store:
    // - explicit property_id from payload
    // - OR propertyId (camel)
    // - OR anything stored in data.propertyId
    const effectivePropertyId: number | null =
      typeof property_id === "number"
        ? property_id
        : typeof propertyId === "number"
        ? propertyId
        : typeof data?.propertyId === "number"
        ? data.propertyId
        : null;

    // Insert into appraisals table – keep everything else in `data` JSON
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
        // Keep propertyId mirrored inside JSON if present
        propertyId: effectivePropertyId ?? data?.propertyId ?? null,
      },
    };

    const { data: inserted, error: insertError } = await supabase
      .from("appraisals")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError || !inserted) {
      console.error(
        "[POST /api/appraisals] insertError",
        JSON.stringify(insertError, null, 2)
      );
      return NextResponse.json(
        {
          error: "Failed to create appraisal",
          supabaseError: insertError,
        },
        { status: 500 }
      );
    }

    const appraisalId = inserted.id as number;

    // ──────────────────────────────────────
    // Optional: link contacts via appraisal_contacts
    // ──────────────────────────────────────
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
        console.error(
          "[POST /api/appraisals] appraisal_contacts insert error",
          JSON.stringify(linkError, null, 2)
        );
        // Not fatal to the main insert – we already have the appraisal
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
