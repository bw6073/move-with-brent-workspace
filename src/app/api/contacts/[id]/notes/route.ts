// src/app/api/contacts/[id]/notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const supabase = await createClient();

  const { id } = await context.params;
  const contactId = Number(id);

  if (Number.isNaN(contactId)) {
    return NextResponse.json({ error: "Invalid contactId" }, { status: 400 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("contact_notes")
    .select("id, contact_id, note, note_type, created_at, updated_at")
    .eq("contact_id", contactId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching contact notes", error);
    return NextResponse.json(
      { error: "Failed to load notes" },
      { status: 500 }
    );
  }

  return NextResponse.json({ notes: data ?? [] }, { status: 200 });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const supabase = await createClient();

  const { id } = await context.params;
  const contactId = Number(id);

  if (Number.isNaN(contactId)) {
    return NextResponse.json({ error: "Invalid contactId" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    note?: string;
    note_type?: string;
  } | null;

  const note = (body?.note ?? "").trim();
  const note_type = (body?.note_type ?? "general").trim() || "general";

  if (!note) {
    return NextResponse.json(
      { error: "Note text is required" },
      { status: 400 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Auth error in notes POST", authError);
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("contact_notes")
    .insert({
      user_id: user.id,
      contact_id: contactId,
      note,
      note_type,
    })
    .select("id, contact_id, note, note_type, created_at, updated_at")
    .single();

  if (error) {
    console.error("Error creating contact note", error);
    return NextResponse.json(
      { error: error.message || "Failed to create note" },
      { status: 500 }
    );
  }

  return NextResponse.json({ note: data }, { status: 201 });
}
