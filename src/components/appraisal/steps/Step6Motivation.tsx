"use client";

import React from "react";
import type { FormState, NonPriceGoals } from "../config/types";

type Step6MotivationProps = {
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  updateNonPriceGoal: (key: keyof NonPriceGoals, value: number) => void;
};

export default function Step6Motivation({
  form,
  updateField,
  updateNonPriceGoal,
}: Step6MotivationProps) {
  const nonPriceGoalLabels: { key: keyof NonPriceGoals; label: string }[] = [
    { key: "bestPrice", label: "Best possible price" },
    { key: "speed", label: "Speed of sale" },
    { key: "minimalDisruption", label: "Minimal disruption to life" },
    { key: "privacy", label: "Privacy / low profile" },
    { key: "longSettlement", label: "Long settlement / rent-back" },
  ];

  const safeGoals: NonPriceGoals =
    form.nonPriceGoals ??
    ({
      bestPrice: 3,
      speed: 3,
      minimalDisruption: 3,
      privacy: 3,
      longSettlement: 3,
    } as NonPriceGoals);

  return (
    <div className="space-y-6">
      {/* MOTIVATION OVERVIEW */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Motivation & expectations
        </h2>
        <p className="text-sm text-slate-500">
          Why they&apos;re moving, when, and what success looks like for them.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Primary reason for moving
            </label>
            <select
              value={form.primaryReason}
              onChange={(e) => updateField("primaryReason", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select</option>
              <option value="upsizing">Upsizing</option>
              <option value="downsizing">Downsizing</option>
              <option value="relocation">Job relocation</option>
              <option value="financial">Financial / mortgage stress</option>
              <option value="deceased">Deceased estate</option>
              <option value="separation">Divorce / separation</option>
              <option value="testing">Testing the market</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Ideal timeframe to move
            </label>
            <select
              value={form.idealTimeframe}
              onChange={(e) => updateField("idealTimeframe", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select</option>
              <option value="asap">As soon as possible</option>
              <option value="0-3">0–3 months</option>
              <option value="3-6">3–6 months</option>
              <option value="6plus">6+ months</option>
              <option value="flexible">Open / flexible</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            What&apos;s prompting the move?
          </label>
          <textarea
            value={form.motivationDetail}
            onChange={(e) => updateField("motivationDetail", e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Any dates we should avoid?
          </label>
          <input
            type="text"
            value={form.datesToAvoid}
            onChange={(e) => updateField("datesToAvoid", e.target.value)}
            placeholder="Holidays, work trips, key life events, etc."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </section>

      {/* PRICE EXPECTATIONS */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Price expectations
        </h3>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.hasPriceExpectation}
            onChange={(e) =>
              updateField("hasPriceExpectation", e.target.checked)
            }
          />
          They have a price range in mind
        </label>

        {form.hasPriceExpectation && (
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Expectation (min)
              </label>
              <input
                type="text"
                value={form.expectationMin}
                onChange={(e) => updateField("expectationMin", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Expectation (max)
              </label>
              <input
                type="text"
                value={form.expectationMax}
                onChange={(e) => updateField("expectationMax", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                Where has this expectation come from?
              </label>
              <select
                value={form.expectationSource}
                onChange={(e) =>
                  updateField("expectationSource", e.target.value)
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                <option value="other_agent">Other agent</option>
                <option value="online_estimate">Online estimate</option>
                <option value="recent_sales">Recent sales they know of</option>
                <option value="bank_broker">Bank / broker</option>
                <option value="own_research">Own research / gut feel</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                Comments about expectations
              </label>
              <textarea
                value={form.expectationComments}
                onChange={(e) =>
                  updateField("expectationComments", e.target.value)
                }
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </section>

      {/* NON-PRICE GOALS */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Non-price goals
        </h3>

        <div className="space-y-3">
          {nonPriceGoalLabels.map(({ key, label }) => (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">{label}</span>
                <span className="text-slate-500">{safeGoals[key]}</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={safeGoals[key]}
                onChange={(e) =>
                  updateNonPriceGoal(key, Number(e.target.value))
                }
                className="w-full"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Anything else that would make this a &ldquo;win&rdquo; for them?
          </label>
          <textarea
            value={form.otherGoalNotes}
            onChange={(e) => updateField("otherGoalNotes", e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </section>
    </div>
  );
}
