"use client";

import React from "react";
import type { FormState } from "../config/types";
import { MARKETING_CHANNELS } from "../config/constants";

type Step8PresentationMarketingProps = {
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  toggleArrayValue: (key: keyof FormState, value: string) => void;
};

export default function Step8PresentationMarketing({
  form,
  updateField,
  toggleArrayValue,
}: Step8PresentationMarketingProps) {
  return (
    <div className="space-y-6">
      {/* PRESENTATION OVERVIEW */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Presentation, marketing & follow-up
        </h2>
        <p className="text-sm text-slate-500">
          How the home presents, who you&apos;ll target and what happens next.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Presentation score (1–10)
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={form.presentationScore}
              onChange={(e) => updateField("presentationScore", e.target.value)}
              className="mt-1 w-full"
            />
            <div className="mt-1 text-xs text-slate-600">
              Current score: {form.presentationScore}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              One-line presentation summary
            </label>
            <input
              type="text"
              value={form.presentationSummary}
              onChange={(e) =>
                updateField("presentationSummary", e.target.value)
              }
              placeholder="Neat but dated – great bones, needs cosmetic refresh."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      {/* MARKETING IDEAS */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Marketing ideas
        </h3>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Target buyer profile
          </label>
          <textarea
            value={form.targetBuyerProfile}
            onChange={(e) => updateField("targetBuyerProfile", e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Headline / angle ideas
          </label>
          <textarea
            value={form.headlineIdeas}
            onChange={(e) => updateField("headlineIdeas", e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Marketing channels
          </label>
          <div className="mt-1 grid gap-2 sm:grid-cols-3">
            {MARKETING_CHANNELS.map((channel) => (
              <label
                key={channel}
                className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={(form.marketingChannels ?? []).includes(channel)}
                  onChange={() =>
                    toggleArrayValue("marketingChannels", channel)
                  }
                />
                <span>{channel}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* FOLLOW-UP */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Follow-up</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Next steps & reminders
            </label>
            <textarea
              value={form.followUpActions}
              onChange={(e) => updateField("followUpActions", e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Follow-up date
            </label>
            <input
              type="date"
              value={form.followUpDate}
              onChange={(e) => updateField("followUpDate", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              Use this later to drive reminders in a dashboard.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
