// src/app/api/contact-timeline/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authed user (RLS)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "[contact-timeline] No authenticated user",
        userError ?? null
      );
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contactIdParam = searchParams.get("contactId");

    if (!contactIdParam) {
      return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
    }

    const contactId = Number(contactIdParam);
    if (Number.isNaN(contactId)) {
      return NextResponse.json(
        { error: "Invalid contactId", raw: contactIdParam },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────
    // Fetch all four sources in parallel
    // ─────────────────────────────────────────
    const [
      { data: noteRows, error: notesError },
      { data: activityRows, error: activitiesError },
      { data: taskRows, error: tasksError },
      { data: appraisalRows, error: appraisalsError },
    ] = await Promise.all([
      supabase
        .from("contact_notes")
        .select(
          `
          id,
          contact_id,
          note,
          created_at
        `
        )
        .eq("contact_id", contactId)
        .eq("user_id", user.id),

      supabase
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
          created_at
        `
        )
        .eq("contact_id", contactId)
        .eq("user_id", user.id),

      supabase
        .from("contact_tasks")
        .select(
          `
          id,
          contact_id,
          task_type,
          title,
          due_date,
          priority,
          status,
          notes,
          related_appraisal_id,
          created_at
        `
        )
        .eq("contact_id", contactId)
        .eq("user_id", user.id),

      supabase
        .from("appraisal_contacts")
        .select(
          `
          id,
          appraisal_id,
          role,
          is_primary,
          created_at,
          appraisals (
            id,
            status,
            created_at,
            data
          )
        `
        )
        .eq("contact_id", contactId),
    ]);

    if (notesError) {
      console.error("[contact-timeline] notesError", notesError);
    }
    if (activitiesError) {
      console.error("[contact-timeline] activitiesError", activitiesError);
    }
    if (tasksError) {
      console.error("[contact-timeline] tasksError", tasksError);
    }
    if (appraisalsError) {
      console.error("[contact-timeline] appraisalsError", appraisalsError);
    }

    // ─────────────────────────────────────────
    // Normalise into a single timeline array
    // ─────────────────────────────────────────

    type TimelineItem = {
      id: string; // unique per item (we’ll prefix with type)
      kind: "note" | "activity" | "task" | "appraisal";
      isoDate: string | null;
      title: string;
      description?: string | null;
      meta?: Record<string, any>;
    };

    const items: TimelineItem[] = [];

    // Notes → "note"
    for (const row of noteRows ?? []) {
      items.push({
        id: `note-${row.id}`,
        kind: "note",
        isoDate: row.created_at,
        title: "Note added",
        description: row.note,
        meta: {
          source: "contact_notes",
        },
      });
    }

    // Activities → "activity"
    for (const row of activityRows ?? []) {
      const when = row.activity_at ?? row.created_at;
      const labelBase =
        row.activity_type === "call"
          ? "Call"
          : row.activity_type === "email"
          ? "Email"
          : row.activity_type === "sms"
          ? "SMS"
          : row.activity_type === "meeting"
          ? "Meeting"
          : row.activity_type ?? "Activity";

      const dir =
        row.direction === "inbound"
          ? "from contact"
          : row.direction === "outbound"
          ? "to contact"
          : null;

      const titleParts = [labelBase, dir].filter(Boolean);
      const title = titleParts.join(" • ") || labelBase;

      items.push({
        id: `activity-${row.id}`,
        kind: "activity",
        isoDate: when,
        title,
        description: row.summary ?? row.subject ?? null,
        meta: {
          type: row.activity_type,
          direction: row.direction,
          subject: row.subject,
          outcome: row.outcome,
          channel: row.channel,
        },
      });
    }

    // Tasks → "task"
    for (const row of taskRows ?? []) {
      const when = row.due_date ?? row.created_at;
      const statusLabel = row.status ?? "pending";

      items.push({
        id: `task-${row.id}`,
        kind: "task",
        isoDate: when,
        title: row.title || "Task",
        description: row.notes ?? null,
        meta: {
          taskType: row.task_type,
          priority: row.priority,
          status: statusLabel,
          dueDate: row.due_date,
          relatedAppraisalId: row.related_appraisal_id,
        },
      });
    }

    // Appraisals via appraisal_contacts → "appraisal"
    for (const row of appraisalRows ?? []) {
      const a = (row as any).appraisals;
      if (!a) continue;

      const data = (a.data ?? {}) as any;
      const label =
        data.appraisalTitle ??
        data.appraisal_title ??
        data.streetAddress ??
        data.street_address ??
        `Appraisal #${a.id}`;

      const suburb = data.suburb ?? null;

      items.push({
        id: `appraisal-${row.id}`,
        kind: "appraisal",
        isoDate: a.created_at ?? row.created_at,
        title: label,
        description: suburb,
        meta: {
          appraisalId: a.id,
          status: a.status ?? data.status ?? null,
          role: row.role,
          isPrimary: row.is_primary,
        },
      });
    }

    // ─────────────────────────────────────────
    // Sort newest → oldest
    // ─────────────────────────────────────────
    items.sort((a, b) => {
      const aTime = a.isoDate ? new Date(a.isoDate).getTime() : 0;
      const bTime = b.isoDate ? new Date(b.isoDate).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[contact-timeline] Unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
