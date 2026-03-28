// src/app/api/settings/email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/requireUser";

export async function GET() {
  try {
    const { user, supabase, errorResponse } = await requireUser();
    if (errorResponse) return errorResponse;

    const { data } = await supabase
      .from("user_settings")
      .select("resend_api_key, resend_from_email, resend_from_name")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      resend_api_key: data?.resend_api_key ? "••••••••" : "",
      resend_api_key_set: Boolean(data?.resend_api_key),
      resend_from_email: data?.resend_from_email ?? "",
      resend_from_name: data?.resend_from_name ?? "",
    });
  } catch (err) {
    console.error("[settings/email GET]", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, supabase, errorResponse } = await requireUser();
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const update: Record<string, string | null> = {
      resend_from_email: body.resend_from_email?.trim() || null,
      resend_from_name: body.resend_from_name?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    // Only update the API key if the user provided a new one (not the masked placeholder)
    if (body.resend_api_key && !body.resend_api_key.startsWith("•")) {
      update.resend_api_key = body.resend_api_key.trim() || null;
    }

    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, ...update }, { onConflict: "user_id" });

    if (error) {
      console.error("[settings/email PATCH]", error);
      return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[settings/email PATCH]", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
