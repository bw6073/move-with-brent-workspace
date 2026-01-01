// src/lib/appraisals/googleEventFromAppraisal.ts
import "server-only";

type AppraisalRow = Record<string, any>;

function pickDateTime(a: AppraisalRow): string | null {
  const data = (a?.data ?? {}) as Record<string, any>;

  // ✅ Your actual source (Step 8)
  return (
    data.followUpAt ||
    a.followUpAt ||
    // (optional legacy support)
    (data.followUpDate ? `${data.followUpDate}T09:00:00.000+08:00` : null) ||
    // other common names (top-level or nested)
    data.appointment_at ||
    a.appointment_at ||
    data.appraisal_at ||
    a.appraisal_at ||
    data.inspection_at ||
    a.inspection_at ||
    data.meeting_at ||
    a.meeting_at ||
    data.appointment_start_at ||
    a.appointment_start_at ||
    data.start_at ||
    a.start_at ||
    null
  );
}

export function googleEventFromAppraisal(appraisal: AppraisalRow) {
  const startIso = pickDateTime(appraisal);
  if (!startIso) {
    throw new Error(
      "No appointment datetime found on appraisal. Set Follow-up date & time (Step 8) or map the correct field in googleEventFromAppraisal.ts"
    );
  }

  const data = (appraisal?.data ?? {}) as Record<string, any>;

  const start = new Date(startIso);
  const endIso =
    data.followUpEndAt ||
    appraisal.followUpEndAt ||
    data.appointment_end_at ||
    appraisal.appointment_end_at ||
    data.end_at ||
    appraisal.end_at ||
    new Date(start.getTime() + 45 * 60 * 1000).toISOString();

  const summary =
    [
      "Appraisal",
      data.streetAddress || appraisal.street_address || appraisal.address,
      data.suburb || appraisal.suburb,
    ]
      .filter(Boolean)
      .join(" – ") || "Appraisal";

  const descriptionLines = [
    data.ownerNames ? `Owner: ${data.ownerNames}` : null,
    data.ownerPhonePrimary ? `Phone: ${data.ownerPhonePrimary}` : null,
    data.ownerEmail ? `Email: ${data.ownerEmail}` : null,
    data.followUpActions ? `Notes: ${data.followUpActions}` : null,
    appraisal.id ? `CRM Appraisal ID: ${appraisal.id}` : null,
  ].filter(Boolean);

  const location =
    [
      data.streetAddress || appraisal.street_address || appraisal.address,
      data.suburb || appraisal.suburb,
      data.state || appraisal.state || "WA",
      data.postcode || appraisal.postcode,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return {
    summary,
    description: descriptionLines.join("\n"),
    location,
    start: {
      dateTime: new Date(startIso).toISOString(),
      timeZone: "Australia/Perth",
    },
    end: {
      dateTime: new Date(endIso).toISOString(),
      timeZone: "Australia/Perth",
    },
  };
}
