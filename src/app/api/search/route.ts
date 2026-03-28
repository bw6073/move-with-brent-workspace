// src/app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/requireUser";

export async function GET(req: NextRequest) {
  try {
    const { user, supabase, errorResponse } = await requireUser();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ contacts: [], properties: [], appraisals: [], tasks: [], deals: [] });
    }

    const pattern = `%${q}%`;

    const [
      { data: contactData },
      { data: propertyData },
      { data: appraisalData },
      { data: taskData },
      { data: dealData },
    ] = await Promise.all([
      // Contacts
      supabase
        .from("contacts")
        .select("id, name, preferred_name, first_name, last_name, email, phone_mobile, suburb")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .or(
          [
            `name.ilike.${pattern}`,
            `preferred_name.ilike.${pattern}`,
            `first_name.ilike.${pattern}`,
            `last_name.ilike.${pattern}`,
            `email.ilike.${pattern}`,
            `phone_mobile.ilike.${pattern}`,
            `suburb.ilike.${pattern}`,
          ].join(",")
        )
        .order("updated_at", { ascending: false })
        .limit(8),

      // Properties
      supabase
        .from("properties")
        .select("id, street_address, suburb, state, postcode, market_status, property_type")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .or(
          [
            `street_address.ilike.${pattern}`,
            `suburb.ilike.${pattern}`,
            `postcode.ilike.${pattern}`,
            `headline.ilike.${pattern}`,
            `notes.ilike.${pattern}`,
          ].join(",")
        )
        .order("updated_at", { ascending: false })
        .limit(8),

      // Appraisals
      supabase
        .from("appraisals")
        .select("id, status, data, created_at")
        .eq("user_id", user.id)
        .or(
          [
            `data->>appraisalTitle.ilike.${pattern}`,
            `data->>streetAddress.ilike.${pattern}`,
            `data->>suburb.ilike.${pattern}`,
          ].join(",")
        )
        .order("created_at", { ascending: false })
        .limit(6),

      // Tasks
      supabase
        .from("tasks")
        .select("id, title, status, priority, due_date")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .ilike("title", pattern)
        .order("due_date", { ascending: true })
        .limit(6),

      // Deals
      supabase
        .from("deals")
        .select("id, title, stage")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .or([`title.ilike.${pattern}`, `notes.ilike.${pattern}`].join(","))
        .order("updated_at", { ascending: false })
        .limit(6),
    ]);

    const contacts = (contactData ?? []).map((c) => ({
      id: c.id,
      displayName:
        c.preferred_name ||
        c.name ||
        [c.first_name, c.last_name].filter(Boolean).join(" ") ||
        "Unnamed contact",
      subtitle: c.email || c.phone_mobile || c.suburb || "",
    }));

    const properties = (propertyData ?? []).map((p) => ({
      id: p.id,
      address: [p.street_address, p.suburb].filter(Boolean).join(", ") || "Untitled property",
      subtitle: [p.property_type, p.market_status].filter(Boolean).join(" · "),
    }));

    const appraisals = (appraisalData ?? []).map((row: any) => {
      const d = (row.data ?? {}) as any;
      return {
        id: row.id,
        title: d.appraisalTitle ?? d.streetAddress ?? `Appraisal #${row.id}`,
        subtitle: [d.streetAddress, d.suburb].filter(Boolean).join(", "),
        status: row.status ?? null,
      };
    });

    const tasks = (taskData ?? []).map((t) => ({
      id: t.id,
      title: t.title ?? "Untitled task",
      subtitle: t.status ?? "",
      priority: t.priority ?? null,
    }));

    const deals = (dealData ?? []).map((d) => ({
      id: d.id,
      title: d.title ?? "Untitled deal",
      subtitle: d.stage ?? "",
    }));

    return NextResponse.json({ contacts, properties, appraisals, tasks, deals });
  } catch (err) {
    console.error("[/api/search] unexpected error:", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
