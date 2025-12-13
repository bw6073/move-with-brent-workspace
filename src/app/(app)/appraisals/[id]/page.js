// src/app/(app)/appraisals/[id]/page.js
import { redirect } from "next/navigation";

export default async function AppraisalIdPage({ params }) {
  const { id } = await params;

  if (!id || id === "undefined") {
    redirect("/appraisals");
  }

  redirect(`/appraisals/${id}/edit`);
}
