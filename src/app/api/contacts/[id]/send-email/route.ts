// src/app/api/contacts/[id]/send-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/requireUser";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const contactId = Number(id);
    if (!id || Number.isNaN(contactId)) {
      return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
    }

    const { user, supabase, errorResponse } = await requireUser();
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => null);
    if (!body?.subject || !body?.message) {
      return NextResponse.json({ error: "Missing subject or message" }, { status: 400 });
    }

    // Load email settings
    const { data: settings } = await supabase
      .from("user_settings")
      .select("resend_api_key, resend_from_email, resend_from_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!settings?.resend_api_key) {
      return NextResponse.json(
        { error: "Email not configured. Add your Resend API key in Settings." },
        { status: 422 }
      );
    }
    if (!settings.resend_from_email) {
      return NextResponse.json(
        { error: "No from address configured. Add one in Settings → Email integration." },
        { status: 422 }
      );
    }

    // Load contact to get their email
    const { data: contact } = await supabase
      .from("contacts")
      .select("email, name, first_name, preferred_name")
      .eq("id", contactId)
      .eq("user_id", user.id)
      .single();

    if (!contact?.email) {
      return NextResponse.json({ error: "This contact has no email address." }, { status: 422 });
    }

    const from = settings.resend_from_name
      ? `${settings.resend_from_name} <${settings.resend_from_email}>`
      : settings.resend_from_email;

    // Convert plain text to simple HTML (preserve line breaks)
    const html = `<div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#1e293b">${
      (body.message as string)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>")
    }</div>`;

    // Send via Resend REST API
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.resend_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [contact.email],
        subject: body.subject,
        html,
        text: body.message,
      }),
    });

    const resendJson = await resendRes.json().catch(() => ({}));

    if (!resendRes.ok) {
      console.error("[send-email] Resend error", resendJson);
      return NextResponse.json(
        { error: resendJson?.message ?? "Failed to send email via Resend." },
        { status: 502 }
      );
    }

    // Log as a contact activity
    await supabase.from("contact_activities").insert({
      user_id: user.id,
      contact_id: contactId,
      activity_type: "email",
      direction: "outbound",
      subject: body.subject,
      summary: (body.message as string).slice(0, 500),
      activity_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, resend_id: resendJson.id });
  } catch (err) {
    console.error("[send-email] unexpected error", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
