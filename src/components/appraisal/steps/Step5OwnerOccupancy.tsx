"use client";

import React, { useState } from "react";
import type { FormState, OccupancyType, MinimalContact } from "../config/types";

type Step5OwnerOccupancyProps = {
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  handleSameAsPropertyToggle: (checked: boolean) => void;
  contactOptions: MinimalContact[];
  linkedContactIds: number[];
  onAddLinkedContact: (contactId: number) => void;
  onRemoveLinkedContact: (contactId: number) => void;
};

export default function Step5OwnerOccupancy({
  form,
  updateField,
  handleSameAsPropertyToggle,
  contactOptions,
  linkedContactIds,
  onAddLinkedContact,
  onRemoveLinkedContact,
}: Step5OwnerOccupancyProps) {
  const [contactSearch, setContactSearch] = useState("");

  const linkedContacts = contactOptions.filter((c) =>
    linkedContactIds.includes(c.id)
  );

  const searchResults =
    contactSearch.trim().length < 2
      ? []
      : contactOptions
          .filter((c) => {
            if (linkedContactIds.includes(c.id)) return false;
            const q = contactSearch.toLowerCase();
            const haystack = [c.name, c.email ?? "", (c as any).phone ?? ""]
              .join(" ")
              .toLowerCase();
            return haystack.includes(q);
          })
          .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* OWNER DETAILS */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Owner & occupancy
        </h2>
        <p className="text-sm text-slate-500">
          Who owns the property and who lives there.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Owner name(s)
            </label>
            <input
              type="text"
              value={form.ownerNames}
              onChange={(e) => updateField("ownerNames", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Primary phone
            </label>
            <input
              type="text"
              value={form.ownerPhonePrimary}
              onChange={(e) => updateField("ownerPhonePrimary", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Secondary phone
            </label>
            <input
              type="text"
              value={form.ownerPhoneSecondary}
              onChange={(e) =>
                updateField("ownerPhoneSecondary", e.target.value)
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={form.ownerEmail}
              onChange={(e) => updateField("ownerEmail", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Postal address
            </label>
            <input
              type="text"
              value={form.postalAddress}
              onChange={(e) => updateField("postalAddress", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={form.sameAsProperty}
                onChange={(e) => handleSameAsPropertyToggle(e.target.checked)}
              />
              Same as property address
            </label>
          </div>
        </div>
      </section>

      {/* OCCUPANCY TYPE */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Occupancy</h3>

        <div className="flex flex-wrap gap-2 text-sm">
          {[
            { label: "Owner occupied", value: "OWNER" },
            { label: "Tenanted", value: "TENANT" },
            { label: "Vacant", value: "VACANT" },
            { label: "Holiday home", value: "HOLIDAY" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                updateField("occupancyType", opt.value as OccupancyType)
              }
              className={`rounded-full border px-3 py-1 text-xs ${
                form.occupancyType === opt.value
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Tenanted section */}
        {form.occupancyType === "TENANT" && (
          <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Tenant name
                </label>
                <input
                  type="text"
                  value={form.tenantName}
                  onChange={(e) => updateField("tenantName", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Lease expiry
                </label>
                <input
                  type="date"
                  value={form.leaseExpiry}
                  onChange={(e) => updateField("leaseExpiry", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700">
                  Current rent
                </label>
                <input
                  type="text"
                  value={form.currentRent}
                  onChange={(e) => updateField("currentRent", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Frequency
                </label>
                <select
                  value={form.rentFrequency}
                  onChange={(e) => updateField("rentFrequency", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                >
                  <option value="pw">Per week</option>
                  <option value="pm">Per month</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Tenancy notes
              </label>
              <textarea
                value={form.tenantNotes}
                onChange={(e) => updateField("tenantNotes", e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
              />
            </div>
          </div>
        )}

        {/* Owner-occupied extra questions */}
        {form.occupancyType === "OWNER" && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                How long have they lived here?
              </label>
              <input
                type="text"
                value={form.ownerHowLong}
                onChange={(e) => updateField("ownerHowLong", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Where are they moving next?
              </label>
              <input
                type="text"
                value={form.ownerNextMove}
                onChange={(e) => updateField("ownerNextMove", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
              />
            </div>
          </div>
        )}
      </section>

      {/* LINKED CONTACTS */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Linked contacts
        </h3>
        <p className="text-xs text-slate-500">
          Link this appraisal to contact records for quick navigation later.
        </p>

        {/* Existing linked contacts */}
        {linkedContacts.length > 0 ? (
          <div className="flex flex-wrap gap-2 text-xs">
            {linkedContacts.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1"
              >
                <span className="font-medium text-slate-800">{c.name}</span>
                {(c as any).phone && (
                  <span className="text-slate-500">{(c as any).phone}</span>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveLinkedContact(c.id)}
                  className="text-slate-500 hover:text-red-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            No contacts linked yet — link at least one owner contact if
            possible.
          </p>
        )}

        {/* Search + add contact */}
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Add existing contact
          </label>
          <input
            type="text"
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            placeholder="Type at least 2 letters to search…"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />

          {contactSearch.trim().length >= 2 && (
            <>
              {searchResults.length > 0 ? (
                <div className="mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white text-sm shadow-sm">
                  {searchResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onAddLinkedContact(c.id);
                        setContactSearch("");
                      }}
                      className="flex w-full items-start justify-between px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-medium text-slate-900">
                          {c.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {c.email || "No contact details"}
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500">Link</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  No matching contacts. Create a new contact first, then link it
                  here.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {/* DECISION MAKERS */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Other decision makers
        </h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Decision makers
            </label>
            <input
              type="text"
              value={form.decisionMakers}
              onChange={(e) => updateField("decisionMakers", e.target.value)}
              placeholder="Both owners, executor, family..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Notes about decision process
            </label>
            <textarea
              value={form.decisionNotes}
              onChange={(e) => updateField("decisionNotes", e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
