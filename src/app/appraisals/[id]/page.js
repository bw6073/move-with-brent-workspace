import { redirect } from "next/navigation";

export default function AppraisalIdPage({ params }) {
  // When someone hits /appraisals/3, send them straight to the edit page
  redirect(`/appraisals/${params.id}/edit`);
}
