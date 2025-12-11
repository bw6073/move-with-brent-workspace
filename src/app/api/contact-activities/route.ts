// src/app/api/contact-activities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const contactIdParam = searchParams.get("contactId");

    if (!contactIdParam) {
      return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
    }

    const contactId = Number(contactIdParam);
    if (Number.isNaN(contactId)) {
      return NextResponse.json({ error: "Invalid contactId" }, { status: 400 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("contact_activities")
      .select(
        `
          id,
          contact_id,
          activity_type,
          direction,
          subject,
          summary,
          outcome,
          channel,
          activity_at,
          created_at,
          updated_at
        `
      )
      .eq("user_id", user.id)
      .eq("contact_id", contactId)
      .order("activity_at", { ascending: false });

    if (error) {
      console.error(
        "Failed to load contact activities",
        JSON.stringify(error, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to load activities", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (err) {
    console.error("Unexpected error in GET /contact-activities", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const contactId = Number(body.contact_id ?? body.contactId);
    if (!contactId || Number.isNaN(contactId)) {
      return NextResponse.json(
        { error: "Invalid or missing contact_id" },
        { status: 400 }
      );
    }

    const activity_type = body.activity_type as
      | "call"
      | "email"
      | "sms"
      | "meeting";
    if (!activity_type) {
      return NextResponse.json(
        { error: "Missing activity_type" },
        { status: 400 }
      );
    }

    const insert = {
      user_id: user.id,
      contact_id: contactId,
      activity_type,
      direction: body.direction ?? null, // inbound/outbound
      subject: body.subject ?? null,
      summary: body.summary ?? null,
      outcome: body.outcome ?? null,
      channel: body.channel ?? null,
      activity_at: body.activity_at
        ? new Date(body.activity_at).toISOString()
        : new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("contact_activities")
      .insert(insert)
      .select(
        `
          id,
          contact_id,
          activity_type,
          direction,
          subject,
          summary,
          outcome,
          channel,
          activity_at,
          created_at,
          updated_at
        `
      )
      .single();

    if (error || !data) {
      console.error(
        "Failed to create contact activity",
        JSON.stringify(error, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to create activity", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ activity: data });
  } catch (err) {
    console.error("Unexpected error in POST /contact-activities", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
