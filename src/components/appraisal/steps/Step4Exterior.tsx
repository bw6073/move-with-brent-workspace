"use client";

import React from "react";
import type { FormState, ExteriorArea } from "../config/types";
import { EXTERIOR_FEATURE_CONFIG } from "../config/exteriorFeatures";

type ExtendedFormState = FormState & {
  exteriorNotes?: string;
};

type Step4ExteriorProps = {
  form: ExtendedFormState;
  updateField: <K extends keyof ExtendedFormState>(
    key: K,
    value: ExtendedFormState[K]
  ) => void;
  addExterior: () => void;
  updateExterior: (id: number, key: keyof ExteriorArea, value: any) => void;
  deleteExterior: (id: number) => void;
};

export default function Step4Exterior({
  form,
  updateField,
  addExterior,
  updateExterior,
  deleteExterior,
}: Step4ExteriorProps) {
  const areas = form.exteriorAreas ?? [];

  return (
    <div className="space-y-6">
      {/* GENERAL EXTERIOR SUMMARY */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Exterior & structures
        </h2>
        <p className="text-sm text-slate-500">
          Record exterior features, structures, and general land
          characteristics.
        </p>

        {/* NEW — general exterior notes */}
        <label className="block text-sm font-medium text-slate-700">
          Exterior notes & landscape summary
        </label>
        <textarea
          value={form.landscapeSummary}
          onChange={(e) => updateField("landscapeSummary", e.target.value)}
          rows={4}
          placeholder="Overall exterior condition, gardens, fencing, driveway, outlook, important notes..."
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </section>

      {/* STRUCTURES */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Structures / outdoor areas
          </h3>
          <button
            type="button"
            onClick={addExterior}
            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700"
          >
            + Add structure
          </button>
        </div>

        {areas.length === 0 && (
          <p className="text-sm text-slate-500">
            Nothing added yet — patio, shed, workshop, pool, driveway, etc.
          </p>
        )}

        <div className="space-y-3">
          {areas.map((area) => (
            <div
              key={area.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">
                  {area.label || "Structure"}
                </span>
                <button
                  type="button"
                  onClick={() => deleteExterior(area.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>

              {/* BASIC DETAILS */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Label
                  </label>
                  <input
                    type="text"
                    value={area.label}
                    onChange={(e) =>
                      updateExterior(area.id, "label", e.target.value)
                    }
                    placeholder="Patio, Shed, Garage..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Type
                  </label>
                  <select
                    value={area.type}
                    onChange={(e) =>
                      updateExterior(area.id, "type", e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  >
                    <option value="patio">Patio</option>
                    <option value="alfresco">Alfresco</option>
                    <option value="deck">Deck</option>
                    <option value="shed">Shed</option>
                    <option value="workshop">Workshop</option>
                    <option value="garage">Garage</option>
                    <option value="carport">Carport</option>
                    <option value="pool">Pool</option>
                    <option value="spa">Spa</option>
                    <option value="tank">Rainwater tank</option>
                    <option value="stable">Stable</option>
                    <option value="arena">Arena</option>
                    <option value="driveway">Driveway</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* DIMENSIONS */}
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Length (m)
                  </label>
                  <input
                    type="text"
                    value={area.lengthMetres || ""}
                    onChange={(e) =>
                      updateExterior(area.id, "lengthMetres", e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Width (m)
                  </label>
                  <input
                    type="text"
                    value={area.widthMetres || ""}
                    onChange={(e) =>
                      updateExterior(area.id, "widthMetres", e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Height (m)
                  </label>
                  <input
                    type="text"
                    value={area.heightMetres || ""}
                    onChange={(e) =>
                      updateExterior(area.id, "heightMetres", e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* STRUCTURE SPECIFIC FIELDS */}
              {(() => {
                const fields =
                  EXTERIOR_FEATURE_CONFIG[area.type] ||
                  EXTERIOR_FEATURE_CONFIG["other"];

                return (
                  <div className="mt-3 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-800">
                      {area.type.charAt(0).toUpperCase() + area.type.slice(1)}{" "}
                      details
                    </h4>

                    {fields.map((f) => (
                      <div key={f.id}>
                        <label className="block text-[11px] font-medium text-slate-700">
                          {f.label}
                        </label>
                        <input
                          type="text"
                          value={area.extraFields?.[f.id] ?? ""}
                          onChange={(e) => {
                            updateExterior(area.id, "extraFields", {
                              ...(area.extraFields ?? {}),
                              [f.id]: e.target.value,
                            });
                          }}
                          placeholder={f.placeholder}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
        {/* NEW — Add another structure from here */}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={addExterior}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            + Add another structure
          </button>
        </div>
      </section>
    </div>
  );
}
