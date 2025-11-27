import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>; // Next 16: params is a Promise
};

// GET → list notes for a contact
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const contactId = Number(id);

    if (!id || Number.isNaN(contactId)) {
      return NextResponse.json(
        { error: "Invalid contact ID", rawId: id ?? null },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Ensure we have an authed user (RLS depends on this)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("GET /contacts/[id]/notes – unauthorised", userError);
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("contact_notes")
      .select(
        `
        id,
        contact_id,
        note,
        created_at,
        updated_at
      `
      )
      .eq("contact_id", contactId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "GET /contacts/[id]/notes – Supabase error",
        JSON.stringify(error, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to load notes", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ notes: data ?? [] });
  } catch (err) {
    console.error("GET /contacts/[id]/notes – unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

// POST → create a new note for this contact
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const contactId = Number(id);

    if (!id || Number.isNaN(contactId)) {
      return NextResponse.json(
        { error: "Invalid contact ID", rawId: id ?? null },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("POST /contacts/[id]/notes – unauthorised", userError);
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.note !== "string" || !body.note.trim()) {
      return NextResponse.json(
        { error: "Note text is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("contact_notes")
      .insert({
        user_id: user.id,
        contact_id: contactId,
        note: body.note.trim(),
      })
      .select(
        `
        id,
        contact_id,
        note,
        created_at,
        updated_at
      `
      )
      .single();

    if (error || !data) {
      console.error(
        "POST /contacts/[id]/notes – Supabase error",
        JSON.stringify(error, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to create note", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ note: data });
  } catch (err) {
    console.error("POST /contacts/[id]/notes – unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
