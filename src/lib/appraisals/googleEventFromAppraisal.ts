// src/lib/appraisals/googleEventFromAppraisal.ts
import "server-only";

type AppraisalRow = Record<string, any>;

function pickDateTime(a: AppraisalRow): string | null {
  // Try common names (adjust to your actual schema later)
  return (
    a.appointment_at ||
    a.appraisal_at ||
    a.inspection_at ||
    a.meeting_at ||
    a.appointment_start_at ||
    a.start_at ||
    null
  );
}

export function googleEventFromAppraisal(appraisal: AppraisalRow) {
  const startIso = pickDateTime(appraisal);
  if (!startIso) {
    throw new Error(
      "No appointment datetime found on appraisal. Add appointment_at (recommended) or map the correct field in googleEventFromAppraisal.ts"
    );
  }

  // Default to 45 minutes if you don’t store an end time
  const start = new Date(startIso);
  const endIso =
    appraisal.appointment_end_at ||
    appraisal.end_at ||
    new Date(start.getTime() + 45 * 60 * 1000).toISOString();

  const titleBits = [
    "Appraisal",
    appraisal.street_address || appraisal.address || appraisal.property_address,
    appraisal.suburb,
  ].filter(Boolean);

  const summary = titleBits.join(" – ") || "Appraisal";

  const descriptionLines = [
    appraisal.vendor_name ? `Owner: ${appraisal.vendor_name}` : null,
    appraisal.phone ? `Phone: ${appraisal.phone}` : null,
    appraisal.email ? `Email: ${appraisal.email}` : null,
    appraisal.notes ? `Notes: ${appraisal.notes}` : null,
    appraisal.id ? `CRM Appraisal ID: ${appraisal.id}` : null,
  ].filter(Boolean);

  const location = [
    appraisal.street_address || appraisal.address || appraisal.property_address,
    appraisal.suburb,
    appraisal.state || "WA",
    appraisal.postcode,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    summary,
    description: descriptionLines.join("\n"),
    location: location || undefined,
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
