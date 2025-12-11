import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: any, context: any) {
  try {
    const paramsMaybePromise = context?.params;
    const params = await paramsMaybePromise;
    const idParam = params?.id ?? context?.params?.id;

    const contactId = Number(idParam);
    if (Number.isNaN(contactId)) {
      return NextResponse.json(
        { error: "Invalid contact id", raw: idParam },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "[contacts/[id]/appraisals] No authenticated user",
        userError ?? null
      );
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // You can adjust this query to match how you actually link contacts↔appraisals.
    // For now, this assumes `data.contactIds` in the appraisals JSON
    // contains the contact's id.
    const { data, error } = await supabase
      .from("appraisals")
      .select("id, data, created_at, status")
      .contains("data->contactIds", [contactId]) // adjust if needed
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "[contacts/[id]/appraisals] Failed to load appraisals",
        error
      );
      return NextResponse.json(
        { error: "Failed to load appraisals" },
        { status: 500 }
      );
    }

    const appraisals =
      data?.map((row: any) => ({
        id: row.id,
        data: row.data,
        contactIds: row.data?.contactIds ?? [],
      })) ?? [];

    return NextResponse.json({ appraisals });
  } catch (err) {
    console.error("[contacts/[id]/appraisals] Unexpected server error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
