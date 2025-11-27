"use client";

import React from "react";
import type { FormState } from "../config/types";

type Step7PricingStrategyProps = {
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

export default function Step7PricingStrategy({
  form,
  updateField,
}: Step7PricingStrategyProps) {
  return (
    <div className="space-y-6">
      {/* PRICING & STRATEGY */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Pricing & strategy
        </h2>
        <p className="text-sm text-slate-500">
          Capture your pricing view and how you&apos;d position the property.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Suggested price range (min)
            </label>
            <input
              type="text"
              value={form.suggestedRangeMin}
              onChange={(e) => updateField("suggestedRangeMin", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Suggested price range (max)
            </label>
            <input
              type="text"
              value={form.suggestedRangeMax}
              onChange={(e) => updateField("suggestedRangeMax", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Pricing strategy
          </label>
          <select
            value={form.pricingStrategy}
            onChange={(e) => updateField("pricingStrategy", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select</option>
            <option value="from">From / Offers above $X</option>
            <option value="offers_in">Offers in the (e.g. high $800s)</option>
            <option value="set_price">Set price</option>
            <option value="auction">Auction</option>
            <option value="set_date">Set date sale</option>
            <option value="eoi">EOI</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Key comparable sales notes
          </label>
          <textarea
            value={form.comparablesNotes}
            onChange={(e) => updateField("comparablesNotes", e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </section>

      {/* PREPARATION */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Recommended preparation
        </h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Must do before photography
            </label>
            <textarea
              value={form.mustDoPrep}
              onChange={(e) => updateField("mustDoPrep", e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Nice to have if possible
            </label>
            <textarea
              value={form.niceToHavePrep}
              onChange={(e) => updateField("niceToHavePrep", e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      {/* FEES & AUTHORITY */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Fee & authority
        </h3>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.feesDiscussed}
            onChange={(e) => updateField("feesDiscussed", e.target.checked)}
          />
          Fees / authority discussed at this appointment
        </label>

        {form.feesDiscussed && (
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Proposed selling fee
              </label>
              <input
                type="text"
                value={form.proposedFee}
                onChange={(e) => updateField("proposedFee", e.target.value)}
                placeholder="e.g. 2.2% + $660 marketing"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Likelihood of signing
              </label>
              <select
                value={form.agreementLikelihood}
                onChange={(e) =>
                  updateField("agreementLikelihood", e.target.value)
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                <option value="very_likely">Very likely</option>
                <option value="likely">Likely</option>
                <option value="unsure">Unsure</option>
                <option value="unlikely">Unlikely</option>
              </select>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
