// src/app/api/google/oauth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/settings/calendar?error=missing_code", url.origin)
    );
  }

  // Optional: basic state parse (keep for CSRF/flow integrity),
  // but DO NOT use it to choose the user.
  try {
    JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    return NextResponse.redirect(
      new URL("/settings/calendar?error=bad_state", url.origin)
    );
  }

  const supabase = await createClient();

  // ✅ Bind the connection to the currently logged-in CRM user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.redirect(
      new URL(
        "/login?next=/settings/calendar&error=unauthenticated",
        url.origin
      )
    );
  }

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "",
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  const tokenData = await tokenResp.json();

  if (!tokenResp.ok) {
    // tokenData may contain error_description
    return NextResponse.redirect(
      new URL(`/settings/calendar?error=token_exchange_failed`, url.origin)
    );
  }

  const expiresIn = Number(tokenData.expires_in ?? 3600);
  const expiry = new Date(Date.now() + expiresIn * 1000).toISOString();

  const { error: upsertError } = await supabase.from("google_accounts").upsert({
    user_id: user.id,
    calendar_id: "primary",
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token ?? null,
    token_type: tokenData.token_type ?? null,
    scope: tokenData.scope ?? null,
    expiry,
    updated_at: new Date().toISOString(),
  });

  if (upsertError) {
    return NextResponse.redirect(
      new URL("/settings/calendar?error=db_save_failed", url.origin)
    );
  }

  return NextResponse.redirect(
    new URL("/settings/calendar?connected=1", url.origin)
  );
}
