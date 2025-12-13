// src/app/(app)/pipeline/page.tsx
import { createClient } from "@/lib/supabase/server";
import { PipelineClient } from "./PipelineClient";
import type { Deal } from "@/components/pipeline/PipelineBoard";

export const dynamic = "force-dynamic";

type MaybeArray<T> = T | T[] | null | undefined;

function normaliseOne<T>(v: MaybeArray<T>): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default async function PipelinePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold mb-2">Pipeline</h1>
        <p className="text-sm text-slate-600">Unauthorised – please sign in.</p>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("deals")
    .select(
      `
      id,
      user_id,
      title,
      stage,
      contact_id,
      property_id,
      appraisal_id,
      estimated_value_low,
      estimated_value_high,
      confidence,
      next_action_at,
      lost_reason,
      notes,
      created_at,
      updated_at,
      contacts:contact_id (
        id,
        first_name,
        last_name,
        phone_mobile,
        email
      ),
      properties:property_id (
        id,
        street_address,
        suburb,
        state,
        postcode
      ),
      appraisals:appraisal_id (
        id,
        status,
        created_at,
        updated_at,
        data
      )
    `
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(
      "Error loading deals",
      error.message,
      error.details,
      error.hint
    );
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold mb-2">Pipeline</h1>
        <p className="text-sm text-red-600">
          Failed to load deals: {error.message}
        </p>
      </div>
    );
  }

  const deals: Deal[] = (data ?? []).map((row: any) => ({
    id: Number(row.id),
    title: row.title ?? null,
    stage: row.stage as Deal["stage"],

    // PipelineBoard expects strings here (it formats them via Number())
    estimated_value_low:
      row.estimated_value_low === null || row.estimated_value_low === undefined
        ? null
        : String(row.estimated_value_low),

    estimated_value_high:
      row.estimated_value_high === null ||
      row.estimated_value_high === undefined
        ? null
        : String(row.estimated_value_high),

    confidence: row.confidence ?? null,
    next_action_at: row.next_action_at ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    notes: row.notes ?? null,

    // joins can come back as arrays depending on select; normalise to single objects
    contacts: normaliseOne(row.contacts),
    properties: normaliseOne(row.properties),
    appraisals: normaliseOne(row.appraisals),
  }));

  return <PipelineClient initialDeals={deals} />;
}
