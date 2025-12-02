// src/app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    // Require at least 2 characters
    if (!q || q.length < 2) {
      return NextResponse.json({
        contacts: [],
        appraisals: [],
      });
    }

    // Current user (RLS relies on this)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const pattern = `%${q}%`;

    // ─────────────────────────────────────────
    // 1) CONTACTS
    // ─────────────────────────────────────────
    const { data: contactData, error: contactError } = await supabase
      .from("contacts")
      .select(
        `
        id,
        name,
        preferred_name,
        first_name,
        last_name,
        email,
        phone_mobile,
        street_address,
        suburb,
        postcode,
        notes
      `
      )
      .eq("user_id", user.id)
      .or(
        [
          `name.ilike.${pattern}`,
          `preferred_name.ilike.${pattern}`,
          `first_name.ilike.${pattern}`,
          `last_name.ilike.${pattern}`,
          `email.ilike.${pattern}`,
          `phone_mobile.ilike.${pattern}`,
          `street_address.ilike.${pattern}`,
          `suburb.ilike.${pattern}`,
          `postcode.ilike.${pattern}`,
          `notes.ilike.${pattern}`,
        ].join(",")
      )
      .order("updated_at", { ascending: false })
      .limit(10);

    if (contactError) {
      // Silent fail for contacts; just return empty array if it breaks
      console.error("[/api/search] contacts error:", contactError);
    }

    const contacts =
      (contactData ?? []).map((c) => {
        const displayName =
          c.preferred_name ||
          c.name ||
          [c.first_name, c.last_name].filter(Boolean).join(" ") ||
          "Unnamed contact";

        const subtitle =
          c.email ||
          c.phone_mobile ||
          [c.street_address, c.suburb].filter(Boolean).join(", ") ||
          "";

        return {
          id: c.id,
          displayName,
          subtitle,
        };
      }) ?? [];

    // ─────────────────────────────────────────
    // 2) APPRAISALS
    // ─────────────────────────────────────────
    const { data: appraisalData, error: appraisalError } = await supabase
      .from("appraisals")
      .select(
        `
        id,
        title,
        address,
        suburb,
        postcode,
        state,
        status,
        data,
        notes,
        created_at
      `
      )
      .eq("user_id", user.id)
      .or(
        [
          // title variants
          `title.ilike.${pattern}`,
          `data->>appraisalTitle.ilike.${pattern}`,
          `data->>appraisal_title.ilike.${pattern}`,

          // address bits
          `address.ilike.${pattern}`,
          `suburb.ilike.${pattern}`,
          `postcode.ilike.${pattern}`,

          // owner + general notes within JSON
          `data->>ownerNames.ilike.${pattern}`,
          `data->>ownerEmail.ilike.${pattern}`,
          `notes.ilike.${pattern}`,
        ].join(",")
      )
      .order("created_at", { ascending: false })
      .limit(10);

    if (appraisalError) {
      console.error("[/api/search] appraisals error:", appraisalError);
    }

    const appraisals =
      (appraisalData ?? []).map((row: any) => {
        const d = (row.data ?? {}) as any;

        const title =
          row.title ??
          d.appraisalTitle ??
          d.appraisal_title ??
          row.address ??
          `Appraisal #${row.id}`;

        const subtitle =
          [
            row.address || "",
            row.suburb || "",
            row.postcode || "",
            row.state || "",
          ]
            .filter(Boolean)
            .join(", ") ||
          d.ownerNames ||
          d.ownerEmail ||
          "";

        return {
          id: row.id,
          title,
          subtitle,
          status: row.status ?? d.status ?? null,
          created_at: row.created_at ?? null,
        };
      }) ?? [];

    return NextResponse.json({
      contacts,
      appraisals,
    });
  } catch (err) {
    console.error("[/api/search] unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
