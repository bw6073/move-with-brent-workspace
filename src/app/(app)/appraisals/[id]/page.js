// src/app/(app)/appraisals/[id]/page.js
import { redirect } from "next/navigation";

export default async function AppraisalIdPage({ params }) {
  // In Next 16, params is a Promise
  const { id } = await params;

  // Guard against bad / undefined ids
  if (!id || id === "undefined") {
    redirect("/appraisals");
  }

  // Send them straight to the edit page for that appraisal
  redirect(`/appraisals/${id}/edit`);
}
