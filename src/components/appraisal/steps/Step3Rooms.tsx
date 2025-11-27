// src/components/appraisal/steps/Step3Rooms.tsx
"use client";

import React from "react";
import type { FormState, Room } from "../config/types";
import { ROOM_FEATURE_CONFIG } from "../config/roomFeatures";

type Step3RoomsProps = {
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  addRoom: () => void;
  updateRoom: (id: number, key: keyof Room, value: any) => void;
  deleteRoom: (id: number) => void;
};

export default function Step3Rooms({
  form,
  updateField,
  addRoom,
  updateRoom,
  deleteRoom,
}: Step3RoomsProps) {
  const rooms = form.rooms ?? [];

  return (
    <div className="space-y-6">
      {/* OVERALL INTERIOR */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Interior rooms</h2>
        <p className="text-sm text-slate-500">
          Capture condition and features room-by-room, plus overall notes.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Overall interior condition
            </label>
            <select
              value={form.overallCondition}
              onChange={(e) => updateField("overallCondition", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select</option>
              <option value="tired">Tired</option>
              <option value="fair">Fair</option>
              <option value="presentable">Presentable</option>
              <option value="well_maintained">Well maintained</option>
              <option value="renovated">Renovated</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Style / theme
            </label>
            <input
              type="text"
              value={form.styleTheme}
              onChange={(e) => updateField("styleTheme", e.target.value)}
              placeholder="Modern, country, 1970s original..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {/* NEW: Overall interior notes */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Interior notes
            </label>
            <textarea
              value={(form as any).interiorNotes ?? ""}
              onChange={(e) =>
                updateField(
                  "interiorNotes" as unknown as keyof FormState,
                  e.target.value
                )
              }
              placeholder="Overall comment on interior – presentation, key updates, wear-and-tear, things to mention in copy..."
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      {/* ROOMS LIST */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Rooms</h3>
          <button
            type="button"
            onClick={addRoom}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            + Add room
          </button>
        </div>

        {rooms.length === 0 && (
          <p className="text-sm text-slate-500">
            No rooms added yet — start with bedrooms or main living.
          </p>
        )}

        <div className="space-y-3">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">
                  {room.label || "Room"}
                </span>
                <button
                  type="button"
                  onClick={() => deleteRoom(room.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>

              {/* ROOM BASICS */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Room label
                  </label>
                  <input
                    type="text"
                    value={room.label}
                    onChange={(e) =>
                      updateRoom(room.id, "label", e.target.value)
                    }
                    placeholder="Bedroom 1, Lounge, Family..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Type
                  </label>
                  <select
                    value={room.type}
                    onChange={(e) =>
                      updateRoom(room.id, "type", e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  >
                    <option value="bedroom">Bedroom</option>
                    <option value="bathroom">Bathroom</option>
                    <option value="ensuite">Ensuite</option>
                    <option value="kitchen">Kitchen</option>
                    <option value="meals">Meals</option>
                    <option value="family">Family</option>
                    <option value="lounge">Lounge</option>
                    <option value="theatre">Theatre</option>
                    <option value="study">Study</option>
                    <option value="laundry">Laundry</option>
                    <option value="alfresco">Alfresco</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* SIZE */}
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Length (m)
                  </label>
                  <input
                    type="text"
                    value={room.lengthMetres || ""}
                    onChange={(e) =>
                      updateRoom(room.id, "lengthMetres", e.target.value)
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
                    value={room.widthMetres || ""}
                    onChange={(e) =>
                      updateRoom(room.id, "widthMetres", e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Condition (1–5)
                  </label>
                  <input
                    type="text"
                    value={room.conditionRating || ""}
                    onChange={(e) =>
                      updateRoom(room.id, "conditionRating", e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* FLOORING */}
              <div className="mt-2">
                <label className="block text-xs font-medium text-slate-700">
                  Flooring
                </label>
                <input
                  type="text"
                  value={room.flooring || ""}
                  onChange={(e) =>
                    updateRoom(room.id, "flooring", e.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                />
              </div>

              {/* HEATING / COOLING */}
              <div className="mt-2">
                <label className="block text-xs font-medium text-slate-700">
                  Cooling / heating
                </label>
                <input
                  type="text"
                  value={room.heatingCooling || ""}
                  onChange={(e) =>
                    updateRoom(room.id, "heatingCooling", e.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                />
              </div>

              {/* SPECIAL FEATURES */}
              <div className="mt-2">
                <label className="block text-xs font-medium text-slate-700">
                  Special features
                </label>
                <textarea
                  value={room.specialFeatures || ""}
                  onChange={(e) =>
                    updateRoom(room.id, "specialFeatures", e.target.value)
                  }
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                />
              </div>

              {/* ROOM-SPECIFIC FEATURE FIELDS */}
              {(() => {
                const config =
                  ROOM_FEATURE_CONFIG[room.type] ||
                  ROOM_FEATURE_CONFIG["other"];

                if (!config || config.length === 0) return null;

                return (
                  <div className="mt-3 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-800">
                      {room.type.charAt(0).toUpperCase() + room.type.slice(1)}{" "}
                      details
                    </h4>

                    {config.map((field) => (
                      <div key={field.id}>
                        <label className="block text-[11px] font-medium text-slate-700">
                          {field.label}
                        </label>
                        <input
                          type="text"
                          value={room.extraFields?.[field.id] ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            updateRoom(room.id, "extraFields", {
                              ...(room.extraFields ?? {}),
                              [field.id]: value,
                            });
                          }}
                          placeholder={field.placeholder}
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

        {/* NEW: Bottom “Add another room” button */}
        {rooms.length > 0 && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={addRoom}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              + Add another room
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
