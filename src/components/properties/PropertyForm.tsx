// src/components/properties/PropertyForm.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type PropertyFormMode = "create" | "edit";

type PropertyFormValues = {
  streetAddress: string;
  suburb: string;
  state: string;
  postcode: string;
  propertyType: string;
  bedrooms: string;
  bathrooms: string;
  carSpaces: string;
  landSize: string;
  landSizeUnit: string;
  zoning: string;
  marketStatus: string;
  headline: string;
  description: string;
  notes: string;
};

type PropertyFormProps = {
  mode?: PropertyFormMode;
  propertyId?: number;
  initialValues?: Partial<PropertyFormValues>;
};

const DEFAULT_VALUES: PropertyFormValues = {
  streetAddress: "",
  suburb: "",
  state: "WA",
  postcode: "",
  propertyType: "",
  bedrooms: "",
  bathrooms: "",
  carSpaces: "",
  landSize: "",
  landSizeUnit: "",
  zoning: "",
  marketStatus: "appraisal",
  headline: "",
  description: "",
  notes: "",
};

export function PropertyForm({
  mode = "create",
  propertyId,
  initialValues = {},
}: PropertyFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<PropertyFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title =
    mode === "edit" ? "Edit property" : "New property (basic details)";

  const handleChange =
    (field: keyof PropertyFormValues) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      setValues((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      setError(null);

      const payload = {
        streetAddress: values.streetAddress.trim() || null,
        suburb: values.suburb.trim() || null,
        state: values.state.trim() || "WA",
        postcode: values.postcode.trim() || null,
        propertyType: values.propertyType.trim() || null,
        bedrooms: values.bedrooms.trim() || null,
        bathrooms: values.bathrooms.trim() || null,
        carSpaces: values.carSpaces.trim() || null,
        landSize: values.landSize.trim() || null,
        landSizeUnit: values.landSizeUnit.trim() || null,
        zoning: values.zoning.trim() || null,
        marketStatus: values.marketStatus.trim() || "appraisal",
        headline: values.headline.trim() || null,
        description: values.description.trim() || null,
        notes: values.notes.trim() || null,
      };

      const isEdit = mode === "edit" && propertyId;
      const url = isEdit ? `/api/properties/${propertyId}` : `/api/properties`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Failed to save property:", txt);
        setError("Failed to save property.");
        return;
      }

      const json = await res.json().catch(() => null);
      const property = json?.property;

      if (!property?.id) {
        setError("Property saved but response was unexpected.");
        return;
      }

      router.push(`/properties/${property.id}`);
    } catch (err) {
      console.error("Unexpected error saving property", err);
      setError("Unexpected error while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500">
            Store the core details once, then link appraisals, contacts and
            tasks to this property.
          </p>
        </div>
      </header>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {/* Address block */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Address</h2>
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Street address
            </label>
            <input
              type="text"
              value={values.streetAddress}
              onChange={handleChange("streetAddress")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="18 Dongara Circle"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Suburb
              </label>
              <input
                type="text"
                value={values.suburb}
                onChange={handleChange("suburb")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Jane Brook"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                State
              </label>
              <input
                type="text"
                value={values.state}
                onChange={handleChange("state")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="WA"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Postcode
              </label>
              <input
                type="text"
                value={values.postcode}
                onChange={handleChange("postcode")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="6056"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Basic details */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Property basics
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Property type
            </label>
            <select
              value={values.propertyType}
              onChange={handleChange("propertyType")}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select…</option>
              <option value="house">House</option>
              <option value="villa">Villa</option>
              <option value="townhouse">Townhouse</option>
              <option value="apartment">Apartment</option>
              <option value="land">Land</option>
              <option value="rural">Rural property</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Market status
            </label>
            <select
              value={values.marketStatus}
              onChange={handleChange("marketStatus")}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="appraisal">Appraisal only</option>
              <option value="pre_market">Pre-market</option>
              <option value="for_sale">For sale</option>
              <option value="under_offer">Under offer</option>
              <option value="sold">Sold</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="off_market">Off market</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Bedrooms
            </label>
            <input
              type="number"
              min={0}
              value={values.bedrooms}
              onChange={handleChange("bedrooms")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Bathrooms
            </label>
            <input
              type="number"
              min={0}
              value={values.bathrooms}
              onChange={handleChange("bathrooms")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Car spaces
            </label>
            <input
              type="number"
              min={0}
              value={values.carSpaces}
              onChange={handleChange("carSpaces")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Land & zoning */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Land & zoning</h2>

        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Land size
            </label>
            <input
              type="number"
              min={0}
              value={values.landSize}
              onChange={handleChange("landSize")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. 1000"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Unit</label>
            <input
              type="text"
              value={values.landSizeUnit}
              onChange={handleChange("landSizeUnit")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="sqm, ha…"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">
            Zoning (optional)
          </label>
          <input
            type="text"
            value={values.zoning}
            onChange={handleChange("zoning")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. R5, Rural Residential…"
          />
        </div>
      </section>

      {/* Headline & notes */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Internal notes</h2>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">
            Internal headline / label
          </label>
          <input
            type="text"
            value={values.headline}
            onChange={handleChange("headline")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. Stone and Seasons, Hidden Resort…"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">
            Description (internal use)
          </label>
          <textarea
            value={values.description}
            onChange={handleChange("description")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            rows={3}
            placeholder="High-level description, quirks, things to remember…"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">
            Notes (internal only)
          </label>
          <textarea
            value={values.notes}
            onChange={handleChange("notes")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            rows={3}
            placeholder="Anything that doesn’t fit elsewhere – background, history, extra context."
          />
        </div>
      </section>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-slate-300 px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {saving
            ? mode === "edit"
              ? "Saving…"
              : "Creating…"
            : mode === "edit"
            ? "Save changes"
            : "Create property"}
        </button>
      </div>
    </form>
  );
}
