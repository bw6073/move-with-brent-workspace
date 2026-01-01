// src/lib/appraisals/googleEventFromAppraisal.ts
import "server-only";

type AppraisalRow = Record<string, any>;

function pickDateTime(a: AppraisalRow): string | null {
  // Your form data is saved under `appraisals.data`
  const d = (a?.data ?? {}) as Record<string, any>;

  return (
    // ✅ preferred: Step 8 datetime-local stores ISO here
    d.followUpAt ||
    // fallback: if you still have date-only
    (d.followUpDate
      ? new Date(`${d.followUpDate}T09:00:00`).toISOString()
      : null) ||
    // legacy / other possible keys you might add later
    d.appointment_at ||
    d.appointmentAt ||
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
      "No appointment datetime found on appraisal. Set Follow-up date & time in Step 8 (followUpAt), then try syncing again."
    );
  }

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid appointment datetime on appraisal.");
  }

  // Default duration: 45 minutes (adjust if you like)
  const endIso =
    (appraisal?.data ?? {})?.followUpEndAt ||
    appraisal.appointment_end_at ||
    appraisal.end_at ||
    new Date(start.getTime() + 45 * 60 * 1000).toISOString();

  const d = (appraisal?.data ?? {}) as Record<string, any>;

  const address =
    d.streetAddress ||
    appraisal.street_address ||
    d.address ||
    appraisal.address ||
    d.property_address ||
    appraisal.property_address ||
    "";

  const suburb = d.suburb || appraisal.suburb || "";

  const summary =
    ["Appraisal", address, suburb].filter(Boolean).join(" – ") || "Appraisal";

  const descriptionLines = [
    d.ownerNames ? `Owner: ${d.ownerNames}` : null,
    d.ownerPhonePrimary ? `Phone: ${d.ownerPhonePrimary}` : null,
    d.ownerEmail ? `Email: ${d.ownerEmail}` : null,
    d.followUpActions ? `Notes: ${d.followUpActions}` : null,
    appraisal.id ? `CRM Appraisal ID: ${appraisal.id}` : null,
  ].filter(Boolean);

  const location = [
    address,
    suburb,
    (d.state || appraisal.state || "WA") as string,
    d.postcode || appraisal.postcode || "",
  ]
    .filter(Boolean)
    .join(" ");

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
