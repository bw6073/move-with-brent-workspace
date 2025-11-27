// src/components/contacts/ContactCreateForm.tsx
"use client";

import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type ContactPayload = {
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  street_address: string;
  suburb: string;
  state: string;
  postcode: string;
  postal_address: string;
  contact_type: string;
  lead_source: string;
  notes: string;
};

export function ContactCreateForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ContactPayload>({
    name: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    street_address: "",
    suburb: "",
    state: "WA",
    postcode: "",
    postal_address: "",
    contact_type: "",
    lead_source: "",
    notes: "",
  });

  const updateField = <K extends keyof ContactPayload>(
    key: K,
    value: ContactPayload[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(
          "Save contact error – status:",
          res.status,
          res.statusText
        );
        console.error("Save contact error – body:", text);
        setError("Failed to save contact.");
        setSaving(false);
        return;
      }

      const saved = await res.json();
      console.log("Contact created:", saved);

      // Go to contact detail page
      if (saved?.id) {
        router.push(`/contacts/${saved.id}`);
      } else {
        router.push("/contacts");
      }
    } catch (err) {
      console.error("Save contact error – unexpected:", err);
      setError("Unexpected error while saving contact.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-slate-900">New contact</h2>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Name */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            First name
          </label>
          <input
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={form.first_name}
            onChange={(e) => updateField("first_name", e.target.value)}
            autoComplete="given-name"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Last name
          </label>
          <input
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={form.last_name}
            onChange={(e) => updateField("last_name", e.target.value)}
            autoComplete="family-name"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">
          Display name (optional)
        </label>
        <input
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          placeholder="If empty, first + last will be used"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
        />
      </div>

      {/* Contact info */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Phone
          </label>
          <input
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            autoComplete="tel"
          />
        </div>
      </div>

      {/* Property / postal address */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">
          Street address
        </label>
        <input
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={form.street_address}
          onChange={(e) => updateField("street_address", e.target.value)}
          placeholder="e.g. 123 Example Road"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Suburb
          </label>
          <input
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={form.suburb}
            onChange={(e) => updateField("suburb", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            State
          </label>
          <input
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={form.state}
            onChange={(e) => updateField("state", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Postcode
          </label>
          <input
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={form.postcode}
            onChange={(e) => updateField("postcode", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">
          Postal address (if different)
        </label>
        <input
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={form.postal_address}
          onChange={(e) => updateField("postal_address", e.target.value)}
          placeholder="Optional"
        />
      </div>

      {/* Type + lead source */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Contact type
          </label>
          <select
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={form.contact_type}
            onChange={(e) => updateField("contact_type", e.target.value)}
          >
            <option value="">Select…</option>
            <option value="owner">Owner</option>
            <option value="buyer">Buyer</option>
            <option value="landlord">Landlord</option>
            <option value="tenant">Tenant</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Lead source
          </label>
          <input
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            placeholder="Letterbox drop, referral, portal, etc."
            value={form.lead_source}
            onChange={(e) => updateField("lead_source", e.target.value)}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">
          Notes
        </label>
        <textarea
          className="min-h-[80px] w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.push("/contacts")}
          className="rounded-full border border-slate-300 px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save contact"}
        </button>
      </div>
    </form>
  );
}
