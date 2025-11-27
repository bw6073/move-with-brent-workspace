"use client";

import React from "react";
import type { FormState, Step } from "../config/types";

type Step9ReviewProps = {
  form: FormState;
  onEditStep: (step: Step) => void;
};

export default function Step9Review({ form, onEditStep }: Step9ReviewProps) {
  const {
    appraisalTitle,
    streetAddress,
    suburb,
    postcode,
    state,
    appraisalDate,
    ownerNames,
    ownerPhonePrimary,
    ownerEmail,
    propertyType,
    bedrooms,
    bathrooms,
    wcs,
    carSpaces,
    suggestedRangeMin,
    suggestedRangeMax,
    pricingStrategy,
    hasPriceExpectation,
    expectationMin,
    expectationMax,
  } = form;

  const fullAddress = streetAddress
    ? `${streetAddress}${
        suburb ? `, ${suburb} ${postcode || ""} ${state || ""}` : ""
      }`
    : suburb
    ? `${suburb} ${postcode || ""} ${state || ""}`
    : "—";

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Review</h2>
        <p className="mt-1 text-sm text-slate-600">
          Quick snapshot of the key details before you save or complete the
          appraisal.
        </p>
      </div>

      {/* Property & owner snapshot */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Property
          </h3>
          <dl className="space-y-1">
            <div>
              <dt className="text-[11px] font-semibold uppercase text-slate-500">
                Title / label
              </dt>
              <dd className="text-slate-800">{appraisalTitle || "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase text-slate-500">
                Address
              </dt>
              <dd className="text-slate-800">{fullAddress}</dd>
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <dt className="text-[11px] font-semibold uppercase text-slate-500">
                  Type
                </dt>
                <dd className="text-slate-800">{propertyType || "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase text-slate-500">
                  Beds / baths / WCs / car
                </dt>
                <dd className="text-slate-800">
                  {bedrooms || "–"} / {bathrooms || "–"} / {wcs || "–"} /{" "}
                  {carSpaces || "–"}
                </dd>
              </div>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase text-slate-500">
                Appraisal date
              </dt>
              <dd className="text-slate-800">{appraisalDate || "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Owners
          </h3>
          <dl className="space-y-1">
            <div>
              <dt className="text-[11px] font-semibold uppercase text-slate-500">
                Owner(s)
              </dt>
              <dd className="text-slate-800">{ownerNames || "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase text-slate-500">
                Phone
              </dt>
              <dd className="text-slate-800">{ownerPhonePrimary || "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase text-slate-500">
                Email
              </dt>
              <dd className="text-slate-800">{ownerEmail || "—"}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Pricing snapshot */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Pricing snapshot
        </h3>
        <dl className="grid gap-4 md:grid-cols-3">
          <div>
            <dt className="text-[11px] font-semibold uppercase text-slate-500">
              Suggested range
            </dt>
            <dd className="text-slate-800">
              {suggestedRangeMin || suggestedRangeMax
                ? `${suggestedRangeMin || "?"} – ${suggestedRangeMax || "?"}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase text-slate-500">
              Pricing strategy
            </dt>
            <dd className="text-slate-800">{pricingStrategy || "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase text-slate-500">
              Vendor expectation
            </dt>
            <dd className="text-slate-800">
              {hasPriceExpectation
                ? `${expectationMin || "?"} – ${expectationMax || "?"}`
                : "Not specifically stated"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Quick links to jump back */}
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="font-semibold text-slate-700">Jump back to edit:</span>
        <button
          type="button"
          onClick={() => onEditStep(1)}
          className="rounded-full border border-slate-200 px-2 py-1 hover:bg-slate-100"
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => onEditStep(3)}
          className="rounded-full border border-slate-200 px-2 py-1 hover:bg-slate-100"
        >
          Interior
        </button>
        <button
          type="button"
          onClick={() => onEditStep(4)}
          className="rounded-full border border-slate-200 px-2 py-1 hover:bg-slate-100"
        >
          Exterior
        </button>
        <button
          type="button"
          onClick={() => onEditStep(6)}
          className="rounded-full border border-slate-200 px-2 py-1 hover:bg-slate-100"
        >
          Motivation & goals
        </button>
        <button
          type="button"
          onClick={() => onEditStep(7)}
          className="rounded-full border border-slate-200 px-2 py-1 hover:bg-slate-100"
        >
          Pricing
        </button>
        <button
          type="button"
          onClick={() => onEditStep(8)}
          className="rounded-full border border-slate-200 px-2 py-1 hover:bg-slate-100"
        >
          Presentation & marketing
        </button>
      </div>
    </section>
  );
}
