// src/app/api/contacts/search/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    if (!q) {
      // no search term: return empty list
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const like = `%${q}%`;

    const { data, error } = await supabase
      .from("contacts")
      .select(
        `
        id,
        name,
        first_name,
        last_name,
        email,
        phone_mobile,
        phone_home,
        phone_work,
        phone,
        created_at
      `
      )
      .eq("user_id", user.id)
      .or(
        [
          `name.ilike.${like}`,
          `first_name.ilike.${like}`,
          `last_name.ilike.${like}`,
          `email.ilike.${like}`,
          `phone_mobile.ilike.${like}`,
          `phone_home.ilike.${like}`,
          `phone_work.ilike.${like}`,
          `phone.ilike.${like}`,
        ].join(",")
      )
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("[GET /api/contacts/search] supabase error", error);
      return NextResponse.json(
        { error: "Failed to search contacts", supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: data ?? [] }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/contacts/search] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
