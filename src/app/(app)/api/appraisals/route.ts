// src/app/(app)/api/appraisals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/requireUser";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawId = url.searchParams.get("id");

  const { user, supabase } = await requireUser();

  try {
    if (rawId) {
      // ---- SINGLE APPRAISAL BY ID ----
      const id = Number(rawId);
      if (!Number.isFinite(id)) {
        return NextResponse.json(
          { error: "Invalid appraisal ID", rawId },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("appraisals")
        .select("*")
        .eq("user_id", user.id)
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("[GET /api/appraisals] Supabase error:", error);
        return NextResponse.json(
          { error: "Error loading appraisal" },
          { status: 500 }
        );
      }

      if (!data) {
        return NextResponse.json(
          { error: "Appraisal not found" },
          { status: 404 }
        );
      }

      // ⬅️ This is the shape EditAppraisalClient expects
      return NextResponse.json({ appraisal: data });
    }

    // ---- LIST ALL APPRAISALS FOR USER ----
    const { data, error } = await supabase
      .from("appraisals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/appraisals] Supabase error:", error);
      return NextResponse.json(
        { error: "Error loading appraisals" },
        { status: 500 }
      );
    }

    return NextResponse.json({ appraisals: data ?? [] });
  } catch (err) {
    console.error("[GET /api/appraisals] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error loading appraisals" },
      { status: 500 }
    );
  }
}
