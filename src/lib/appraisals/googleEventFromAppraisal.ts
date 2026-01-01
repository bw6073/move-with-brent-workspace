// src/lib/appraisals/googleEventFromAppraisal.ts
import "server-only";

type AppraisalRow = Record<string, any>;

function pickDateTime(a: AppraisalRow): string | null {
  // ✅ 1) Prefer JSON data field (your Step 8 card writes to this)
  const followUpAt =
    a?.data?.followUpAt ||
    a?.data?.follow_up_at ||
    a?.data?.appointmentAt ||
    a?.data?.appointment_at;

  if (typeof followUpAt === "string" && followUpAt.trim()) return followUpAt;

  // ✅ 2) Back-compat: if only a date exists, assume 09:00 local
  const followUpDate = a?.data?.followUpDate || a?.data?.follow_up_date;
  if (typeof followUpDate === "string" && followUpDate.trim()) {
    const d = new Date(`${followUpDate}T09:00:00`);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  // ✅ 3) Finally try top-level columns (if you ever add them later)
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
      "No appointment datetime found on appraisal. Set Follow-up date & time (Step 8) or map the correct field in googleEventFromAppraisal.ts"
    );
  }

  const start = new Date(startIso);

  const endIso =
    appraisal?.data?.followUpEndAt ||
    appraisal?.data?.appointment_end_at ||
    appraisal.appointment_end_at ||
    appraisal.end_at ||
    new Date(start.getTime() + 45 * 60 * 1000).toISOString();

  const titleBits = [
    "Appraisal",
    appraisal?.data?.streetAddress ||
      appraisal.street_address ||
      appraisal.address ||
      appraisal.property_address,
    appraisal?.data?.suburb || appraisal.suburb,
  ].filter(Boolean);

  const summary = titleBits.join(" – ") || "Appraisal";

  const descriptionLines = [
    appraisal?.data?.ownerNames ? `Owner: ${appraisal.data.ownerNames}` : null,
    appraisal?.data?.ownerPhonePrimary
      ? `Phone: ${appraisal.data.ownerPhonePrimary}`
      : null,
    appraisal?.data?.ownerEmail ? `Email: ${appraisal.data.ownerEmail}` : null,
    appraisal?.data?.followUpActions
      ? `Notes: ${appraisal.data.followUpActions}`
      : null,
    appraisal.id ? `CRM Appraisal ID: ${appraisal.id}` : null,
  ].filter(Boolean);

  const location = [
    appraisal?.data?.streetAddress ||
      appraisal.street_address ||
      appraisal.address ||
      appraisal.property_address,
    appraisal?.data?.suburb || appraisal.suburb,
    appraisal?.data?.state || appraisal.state || "WA",
    appraisal?.data?.postcode || appraisal.postcode,
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
