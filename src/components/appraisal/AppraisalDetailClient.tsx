"use client";

import React from "react";
import { CreateDealButton } from "../pipeline/CreateDealButton";

type Appraisal = {
  id: number;
  title: string | null;
  property_id: number | null;
  properties?: {
    street_address: string | null;
    suburb: string | null;
    state: string | null;
    postcode: string | null;
  } | null;
};

type Props = {
  initialAppraisal: Appraisal;
};

export default function AppraisalDetailClient({ initialAppraisal }: Props) {
  const a = initialAppraisal;

  const address = a.properties
    ? `${a.properties.street_address ?? ""}${
        a.properties.suburb ? `, ${a.properties.suburb}` : ""
      }`.trim()
    : "";

  const title = a.title || address || `Appraisal #${a.id}`;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
            {title}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Appraisal #{a.id}</p>
        </div>

        <CreateDealButton
          appraisalId={a.id}
          propertyId={a.property_id ?? undefined}
          defaultTitle={title}
          defaultStage="appraisal"
        />
      </div>

      {/* Existing / future appraisal UI */}
      <div className="flex items-center gap-2">
        <a
          href={`/appraisals/${a.id}/edit`}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
        >
          Edit
        </a>

        <CreateDealButton
          appraisalId={a.id}
          propertyId={a.property_id ?? undefined}
          defaultTitle={title || `Appraisal #${a.id}`}
          defaultStage="appraisal"
        />
      </div>
    </div>
  );
}
