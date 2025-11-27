// src/components/appraisal/steps/Step1Overview.tsx
import React from "react";
import { FormState } from "../config/types";

type Props = {
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

const Step1Overview: React.FC<Props> = ({ form, updateField }) => {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Appraisal overview
        </h2>
        <p className="text-sm text-slate-500">
          Start the record with the basics. You can fill in the detail later.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Appraisal title
            </label>
            <input
              type="text"
              value={form.appraisalTitle}
              onChange={(e) => updateField("appraisalTitle", e.target.value)}
              placeholder="11 Maple Crescent Helena Valley – Initial appraisal"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                Street address *
              </label>
              <input
                type="text"
                value={form.streetAddress}
                onChange={(e) => updateField("streetAddress", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Suburb *
              </label>
              <input
                type="text"
                value={form.suburb}
                onChange={(e) => updateField("suburb", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Postcode *
                </label>
                <input
                  type="text"
                  value={form.postcode}
                  onChange={(e) => updateField("postcode", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  State
                </label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Appraisal date
              </label>
              <input
                type="date"
                value={form.appraisalDate}
                onChange={(e) => updateField("appraisalDate", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Source of enquiry
              </label>
              <select
                value={form.sourceOfEnquiry}
                onChange={(e) => updateField("sourceOfEnquiry", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                <option value="repeat_client">Repeat client</option>
                <option value="referral">Referral</option>
                <option value="portal">Portal lead</option>
                <option value="website">Website form</option>
                <option value="letterbox">Letterbox / flyer</option>
                <option value="cold_call">Cold call / door knock</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Notes about first contact
            </label>
            <textarea
              value={form.firstContactNotes}
              onChange={(e) => updateField("firstContactNotes", e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Step1Overview;
