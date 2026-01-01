// src/lib/appraisals/googleEventFromAppraisal.ts
import "server-only";

type AppraisalRow = Record<string, any>;

function pickAppointmentIso(a: AppraisalRow): string | null {
  // 1) Prefer explicit DB columns if you ever add them later
  const top =
    a.appointment_at ||
    a.appraisal_at ||
    a.inspection_at ||
    a.meeting_at ||
    a.appointment_start_at ||
    a.start_at;

  if (typeof top === "string" && top) return top;

  // 2) Current reality: stored in JSON column "data"
  const followUpAt = a?.data?.followUpAt;
  if (typeof followUpAt === "string" && followUpAt) return followUpAt;

  // Optional backwards compat: old "followUpDate" (date only) in JSON
  const followUpDate = a?.data?.followUpDate;
  if (typeof followUpDate === "string" && followUpDate) {
    // Default to 09:00 Perth time for date-only values
    const d = new Date(`${followUpDate}T09:00:00`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  return null;
}

export function googleEventFromAppraisal(appraisal: AppraisalRow) {
  const startIso = pickAppointmentIso(appraisal);

  if (!startIso) {
    throw new Error(
      "No appointment datetime found on appraisal. Set Follow-up date & time (Step 8) or map the correct field in googleEventFromAppraisal.ts"
    );
  }

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Appointment datetime is invalid.");
  }

  // Default to 45 minutes if you don’t store an end time
  const endIso =
    appraisal.appointment_end_at ||
    appraisal.end_at ||
    new Date(start.getTime() + 45 * 60 * 1000).toISOString();

  const addr =
    appraisal.street_address ||
    appraisal.address ||
    appraisal.property_address ||
    appraisal?.data?.streetAddress ||
    "";

  const suburb = appraisal.suburb || appraisal?.data?.suburb || "";

  const summary =
    ["Appraisal", addr, suburb].filter(Boolean).join(" – ") || "Appraisal";

  const owner =
    appraisal.vendor_name ||
    appraisal?.data?.ownerNames ||
    appraisal?.data?.vendorName ||
    null;

  const phone =
    appraisal.phone ||
    appraisal?.data?.ownerPhonePrimary ||
    appraisal?.data?.phone ||
    null;

  const email = appraisal.email || appraisal?.data?.ownerEmail || null;

  const notes =
    appraisal.notes ||
    appraisal?.data?.followUpActions ||
    appraisal?.data?.notes ||
    null;

  const descriptionLines = [
    owner ? `Owner: ${owner}` : null,
    phone ? `Phone: ${phone}` : null,
    email ? `Email: ${email}` : null,
    notes ? `Notes: ${notes}` : null,
    appraisal.id ? `CRM Appraisal ID: ${appraisal.id}` : null,
  ].filter(Boolean);

  const state = appraisal.state || appraisal?.data?.state || "WA";
  const postcode = appraisal.postcode || appraisal?.data?.postcode || "";

  const location = [addr, suburb, state, postcode].filter(Boolean).join(" ");

  return {
    summary,
    description: descriptionLines.join("\n"),
    location: location || undefined,
    start: { dateTime: start.toISOString(), timeZone: "Australia/Perth" },
    end: {
      dateTime: new Date(endIso).toISOString(),
      timeZone: "Australia/Perth",
    },
  };
}
