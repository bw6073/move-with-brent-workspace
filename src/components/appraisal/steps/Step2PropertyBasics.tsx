// src/components/appraisal/steps/Step2PropertyBasics.tsx
import React from "react";
import { FormState } from "../config/types";
import { SERVICES, OUTDOOR_FEATURES } from "../config/constants";

type Props = {
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  toggleArrayValue: (key: keyof FormState, value: string) => void;
};

const Step2PropertyBasics: React.FC<Props> = ({
  form,
  updateField,
  toggleArrayValue,
}) => {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Property basics & site
        </h2>
        <p className="text-sm text-slate-500">
          Capture the core specs you&apos;ll use later for marketing and
          pricing.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-slate-700">
              Property type
            </label>
            <select
              value={form.propertyType}
              onChange={(e) => updateField("propertyType", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="house">House</option>
              <option value="unit">Unit / Apartment</option>
              <option value="townhouse">Townhouse</option>
              <option value="villa">Villa</option>
              <option value="rural">Rural / Lifestyle</option>
              <option value="land">Vacant land</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Year built
            </label>
            <input
              type="text"
              value={form.yearBuilt}
              onChange={(e) => updateField("yearBuilt", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Construction
            </label>
            <input
              type="text"
              value={form.construction}
              onChange={(e) => updateField("construction", e.target.value)}
              placeholder="Brick & tile, weatherboard, etc."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Land area
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={form.landArea}
                onChange={(e) => updateField("landArea", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={form.landAreaUnit}
                onChange={(e) => updateField("landAreaUnit", e.target.value)}
                className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="sqm">m²</option>
                <option value="ha">ha</option>
                <option value="acres">acres</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Zoning
            </label>
            <input
              type="text"
              value={form.zoning}
              onChange={(e) => updateField("zoning", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Block shape
            </label>
            <select
              value={form.blockShape}
              onChange={(e) => updateField("blockShape", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select</option>
              <option value="regular">Regular</option>
              <option value="corner">Corner</option>
              <option value="battleaxe">Battle-axe</option>
              <option value="irregular">Irregular</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Slope
            </label>
            <select
              value={form.slope}
              onChange={(e) => updateField("slope", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select</option>
              <option value="level">Level</option>
              <option value="gentle">Gentle slope</option>
              <option value="steep">Steep</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Outlook / views
            </label>
            <input
              type="text"
              value={form.outlook}
              onChange={(e) => updateField("outlook", e.target.value)}
              placeholder="Valley outlook, treetop views, etc."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Bedrooms
            </label>
            <input
              type="text"
              value={form.bedrooms}
              onChange={(e) => updateField("bedrooms", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Bathrooms
            </label>
            <input
              type="text"
              value={form.bathrooms}
              onChange={(e) => updateField("bathrooms", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              WCs
            </label>
            <input
              type="text"
              value={form.wcs}
              onChange={(e) => updateField("wcs", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Car spaces
            </label>
            <input
              type="text"
              value={form.carSpaces}
              onChange={(e) => updateField("carSpaces", e.target.value)}
              placeholder="e.g. 2 garage + 1 carport"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Services</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          {SERVICES.map((service) => (
            <label
              key={service}
              className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                checked={(form.services ?? []).includes(service)}
                onChange={() => toggleArrayValue("services", service)}
              />
              <span>{service}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Outdoor features
        </h3>
        <div className="grid gap-2 sm:grid-cols-3">
          {OUTDOOR_FEATURES.map((feature) => (
            <label
              key={feature}
              className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                checked={(form.outdoorFeatures ?? []).includes(feature)}
                onChange={() => toggleArrayValue("outdoorFeatures", feature)}
              />
              <span>{feature}</span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Step2PropertyBasics;
