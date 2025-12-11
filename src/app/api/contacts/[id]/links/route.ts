// src/app/api/contacts/[id]/links/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>; // Next 16: params is a Promise
};

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const numericId = Number(id);

  if (!id || Number.isNaN(numericId)) {
    return NextResponse.json(
      { error: "Invalid contact ID", rawId: id ?? null },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // 1) Load link rows for this contact
    const { data: links, error: linkError } = await supabase
      .from("contact_links")
      .select(
        "id, contact_id, linked_contact_id, relationship_type, created_at"
      )
      .eq("user_id", user.id)
      .eq("contact_id", numericId)
      .order("created_at", { ascending: true });

    if (linkError) {
      console.error("[GET /api/contacts/[id]/links] supabase error", linkError);
      return NextResponse.json(
        { error: "Failed to load links", supabaseError: linkError },
        { status: 500 }
      );
    }

    if (!links || links.length === 0) {
      return NextResponse.json({ links: [] }, { status: 200 });
    }

    // 2) Load the linked contacts in one go
    const linkedIds = Array.from(
      new Set(
        links
          .map((l) => l.linked_contact_id)
          .filter((v): v is number => typeof v === "number")
      )
    );

    if (linkedIds.length === 0) {
      return NextResponse.json({ links: [] }, { status: 200 });
    }

    const { data: contacts, error: contactError } = await supabase
      .from("contacts")
      .select(
        `
          id,
          full_name,
          name,
          first_name,
          last_name,
          email,
          phone_mobile,
          mobile,
          phone
        `
      )
      .in("id", linkedIds)
      .eq("user_id", user.id);

    if (contactError) {
      console.error(
        "[GET /api/contacts/[id]/links] contacts supabase error",
        contactError
      );
      return NextResponse.json(
        {
          error: "Failed to load linked contacts",
          supabaseError: contactError,
        },
        { status: 500 }
      );
    }

    const contactsById = new Map<number, any>();
    for (const c of contacts ?? []) {
      contactsById.set(c.id, c);
    }

    const result = links.map((l) => {
      const c = contactsById.get(l.linked_contact_id);
      let displayName: string | null = null;
      if (c) {
        displayName =
          c.full_name ||
          c.name ||
          [c.first_name, c.last_name].filter(Boolean).join(" ") ||
          null;
      }

      return {
        id: l.id,
        contact_id: l.contact_id,
        linked_contact_id: l.linked_contact_id,
        relationship_type: l.relationship_type,
        created_at: l.created_at,
        contact: c
          ? {
              id: c.id,
              displayName,
              email: c.email ?? null,
              phone: c.phone_mobile ?? c.mobile ?? c.phone ?? null,
            }
          : null,
      };
    });

    return NextResponse.json({ links: result }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/contacts/[id]/links] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
