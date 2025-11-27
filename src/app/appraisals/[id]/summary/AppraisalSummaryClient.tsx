// src/app/appraisals/[id]/summary/AppraisalSummaryClient.tsx
"use client";

import React from "react";
import type { FormState } from "@/components/appraisal/config/types";

type AppraisalRecord = {
  id: number;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Props = {
  appraisal: AppraisalRecord;
  form: FormState;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export function AppraisalSummaryClient({ appraisal, form }: Props) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const fullAddress = [
    form.streetAddress,
    form.suburb,
    form.state || "WA",
    form.postcode,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6 bg-white p-6 shadow-sm rounded-xl print:shadow-none print:p-0 print:bg-white">
      {/* Top toolbar (hidden when printing) */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Appraisal summary
          </h2>
          <p className="text-xs text-slate-500">
            Use “Print / Save as PDF” to generate a copy for your records.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Header block */}
      <section className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          {form.appraisalTitle || fullAddress || `Appraisal #${appraisal.id}`}
        </h1>
        {fullAddress && (
          <p className="mt-1 text-sm text-slate-600">{fullAddress}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
          <div>
            <span className="font-semibold">Status:</span>{" "}
            {appraisal.status ?? "DRAFT"}
          </div>
          <div>
            <span className="font-semibold">Created:</span>{" "}
            {formatDate(appraisal.created_at)}
          </div>
          <div>
            <span className="font-semibold">Last updated:</span>{" "}
            {formatDate(appraisal.updated_at)}
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="border-b border-slate-200 pb-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          1. Overview
        </h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Appraisal type
            </p>
            <p className="text-slate-800">
              {(form as any).appraisalType || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">
              Appraisal date
            </p>
            <p className="text-slate-800">{form.appraisalDate || "—"}</p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-slate-500">
              Notes / key points
            </p>
            <p className="whitespace-pre-wrap text-slate-800">
              {(form as any).overviewNotes ?? (form as any).overview ?? "—"}
            </p>
          </div>
        </div>
      </section>

      {/* Property basics */}
      <section className="border-b border-slate-200 pb-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          2. Property basics & site
        </h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">Bedrooms</p>
            <p className="text-slate-800">
              {form.bedrooms ? String(form.bedrooms) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Bathrooms</p>
            <p className="text-slate-800">
              {form.bathrooms ? String(form.bathrooms) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Parking</p>
            <p className="text-slate-800">{(form as any).parking || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Land size & zoning
            </p>
            <p className="text-slate-800">
              {(form as any).landSize || "—"}
              {form.zoning ? ` · ${form.zoning}` : ""}
            </p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-slate-500">
              Site notes / locality
            </p>
            <p className="whitespace-pre-wrap text-slate-800">
              {(form as any).siteNotes || "—"}
            </p>
          </div>
        </div>
      </section>

      {/* Interior */}
      <section className="border-b border-slate-200 pb-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          3. Interior
        </h2>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Overall interior condition
            </p>
            <p className="text-slate-800">{form.overallCondition || "—"}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">
              Style / theme
            </p>
            <p className="text-slate-800">{form.styleTheme || "—"}</p>
          </div>

          {(form as any).interiorNotes && (
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-slate-500">
                Interior notes
              </p>
              <p className="whitespace-pre-wrap text-slate-800">
                {(form as any).interiorNotes}
              </p>
            </div>
          )}
        </div>

        {form.rooms && form.rooms.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-slate-500">
              Rooms (summary)
            </p>
            <ul className="space-y-1 text-xs">
              {form.rooms.map((room) => (
                <li
                  key={room.id}
                  className="rounded border border-slate-200 px-2 py-1"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-slate-900">
                      {room.label || room.type || "Room"}
                    </span>
                    {room.conditionRating && (
                      <span className="text-[11px] text-slate-500">
                        Condition: {room.conditionRating}/5
                      </span>
                    )}
                  </div>
                  {room.specialFeatures && (
                    <p className="mt-0.5 text-[11px] text-slate-700">
                      {room.specialFeatures}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Exterior */}
      <section className="border-b border-slate-200 pb-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          4. Exterior & land
        </h2>

        <div className="text-sm space-y-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Landscape summary
            </p>
            <p className="whitespace-pre-wrap text-slate-800">
              {form.landscapeSummary || "—"}
            </p>
          </div>

          {(form as any).exteriorNotes && (
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Exterior notes
              </p>
              <p className="whitespace-pre-wrap text-slate-800">
                {(form as any).exteriorNotes}
              </p>
            </div>
          )}
        </div>

        {form.exteriorAreas && form.exteriorAreas.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-slate-500">
              Structures / outdoor areas
            </p>
            <ul className="space-y-1 text-xs">
              {form.exteriorAreas.map((area) => (
                <li
                  key={area.id}
                  className="rounded border border-slate-200 px-2 py-1"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-slate-900">
                      {area.label || area.type || "Structure"}
                    </span>
                  </div>
                  {area.extraFields && (
                    <p className="mt-0.5 text-[11px] text-slate-700">
                      {Object.values(area.extraFields)
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Owner & occupancy */}
      <section className="border-b border-slate-200 pb-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          5. Owner & occupancy
        </h2>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Owner name(s)
            </p>
            <p className="text-slate-800">{form.ownerNames || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Primary phone / email
            </p>
            <p className="text-slate-800">
              {form.ownerPhonePrimary || "—"}
              {form.ownerEmail ? ` · ${form.ownerEmail}` : ""}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Postal address
            </p>
            <p className="text-slate-800">{form.postalAddress || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Occupancy</p>
            <p className="text-slate-800">{form.occupancyType || "—"}</p>
          </div>
        </div>
      </section>

      {/* Motivation & pricing (high level) */}
      <section className="border-b border-slate-200 pb-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          6. Motivation & pricing
        </h2>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Motivation notes
            </p>
            <p className="whitespace-pre-wrap text-slate-800">
              {(form as any).motivationNotes || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Pricing thoughts
            </p>
            <p className="whitespace-pre-wrap text-slate-800">
              {(form as any).pricingNotes || "—"}
            </p>
          </div>
        </div>
      </section>

      {/* Presentation & follow-up */}
      <section>
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          7. Presentation, marketing & follow-up
        </h2>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Presentation notes
            </p>
            <p className="whitespace-pre-wrap text-slate-800">
              {(form as any).presentationNotes ||
                (form.presentationScore !== undefined &&
                form.presentationScore !== null
                  ? String(form.presentationScore)
                  : "—")}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Follow-up plan
            </p>
            <p className="whitespace-pre-wrap text-slate-800">
              {(form as any).followUpPlan || "—"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
