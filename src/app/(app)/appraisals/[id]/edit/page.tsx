// src/app/(app)/appraisals/[id]/edit/page.tsx
import React from "react";
import EditAppraisalClient from "./EditAppraisalClient";

type PageProps = {
  // In Next 16, params is a Promise
  params: Promise<{ id: string }>;
};

export default async function EditAppraisalPage({ params }: PageProps) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-10 text-sm text-red-600">
          Invalid appraisal ID in URL.
        </div>
      </div>
    );
  }

  return <EditAppraisalClient appraisalId={id} />;
}
