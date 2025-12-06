// src/components/contacts/ContactEditForm.tsx
"use client";

import React, { useState } from "react";

export type Contact = {
  id: number;
  user_id?: string | null;
  preferred_name?: string | null;

  name: string | null;
  first_name: string | null;
  last_name: string | null;

  email: string | null;

  phone_mobile: string | null;
  phone_home: string | null;
  phone_work: string | null;
  phone: string | null;

  street_address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  postal_address: string | null;

  contact_type: string | null;
  lead_source: string | null;

  notes: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

type ContactEditFormProps = {
  contact: Contact;
  onUpdated?: (contact: Contact) => void;
};

const prevOrEmpty = (v: string | null | undefined) => v ?? "";

export function ContactEditForm({ contact, onUpdated }: ContactEditFormProps) {
  const [form, setForm] = useState<Contact>({
    ...contact,
    preferred_name: contact.preferred_name ?? "",
    first_name: contact.first_name ?? "",
    last_name: contact.last_name ?? "",
    email: contact.email ?? "",
    phone_mobile: contact.phone_mobile ?? "",
    phone_home: contact.phone_home ?? "",
    phone_work: contact.phone_work ?? "",
    phone: contact.phone ?? "",
    street_address: contact.street_address ?? "",
    suburb: contact.suburb ?? "",
    state: contact.state ?? "",
    postcode: contact.postcode ?? "",
    postal_address: contact.postal_address ?? "",
    contact_type: contact.contact_type ?? "",
    lead_source: contact.lead_source ?? "",
    notes: contact.notes ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleChange =
    (field: keyof Contact) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const value = e.target.value;

      setForm((prev) => {
        const next: Contact = {
          ...prev,
          [field]: value,
        };

        if (
          field === "first_name" ||
          field === "last_name" ||
          field === "preferred_name"
        ) {
          const first =
            field === "first_name" ? value : prevOrEmpty(prev.first_name);
          const last =
            field === "last_name" ? value : prevOrEmpty(prev.last_name);
          const preferred =
            field === "preferred_name"
              ? value
              : prevOrEmpty(prev.preferred_name);

          const fullName = `${first} ${last}`.trim().replace(/\s+/g, " ");
          next.name = (preferred || fullName || prev.name || "").trim();
        }

        return next;
      });
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);
    setSavedMessage(null);

    try {
      const fullName = `${form.first_name ?? ""} ${form.last_name ?? ""}`
        .trim()
        .replace(/\s+/g, " ");

      const payload = {
        name: form.name || form.preferred_name || fullName || null,
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        preferred_name: form.preferred_name || null,
        email: form.email || null,

        phone_mobile: form.phone_mobile || null,
        phone_home: form.phone_home || null,
        phone_work: form.phone_work || null,
        phone: form.phone || null,

        street_address: form.street_address || null,
        suburb: form.suburb || null,
        state: form.state || null,
        postcode: form.postcode || null,
        postal_address: form.postal_address || null,

        contact_type: form.contact_type || null,
        lead_source: form.lead_source || null,
        notes: form.notes || null,
      };

      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Failed to update contact – status:", res.status);
        console.error("Failed to update contact – body:", text);
        setError("There was a problem saving the contact.");
        return;
      }

      const json = await res.json().catch(() => null);
      console.log("Contact updated:", json);

      const updated: Contact = {
        ...form,
        ...(json?.contact ?? {}),
      };

      setSavedMessage("Saved");

      setForm((prev) => ({
        ...prev,
        ...updated,
        preferred_name: updated.preferred_name ?? "",
        first_name: updated.first_name ?? "",
        last_name: updated.last_name ?? "",
        email: updated.email ?? "",
        phone_mobile: updated.phone_mobile ?? "",
        phone_home: updated.phone_home ?? "",
        phone_work: updated.phone_work ?? "",
        phone: updated.phone ?? "",
        street_address: updated.street_address ?? "",
        suburb: updated.suburb ?? "",
        state: updated.state ?? "",
        postcode: updated.postcode ?? "",
        postal_address: updated.postal_address ?? "",
        contact_type: updated.contact_type ?? "",
        lead_source: updated.lead_source ?? "",
        notes: updated.notes ?? "",
      }));

      if (onUpdated) {
        onUpdated(updated);
      }
    } catch (err) {
      console.error("Unexpected error updating contact", err);
      setError("Unexpected error while saving the contact.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;

    const ok = window.confirm(
      "Delete this contact? This cannot be undone and may affect linked appraisals."
    );
    if (!ok) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Failed to delete contact – status:", res.status);
        console.error("Failed to delete contact – body:", text);
        setError("There was a problem deleting the contact.");
        setDeleting(false);
        return;
      }

      window.location.href = "/contacts";
    } catch (err) {
      console.error("Unexpected error deleting contact", err);
      setError("Unexpected error while deleting the contact.");
      setDeleting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Edit contact</h2>
        {savedMessage && (
          <span className="text-xs text-emerald-600">{savedMessage}</span>
        )}
      </div>

      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {/* First & last name */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            First name
          </label>
          <input
            type="text"
            value={form.first_name ?? ""}
            onChange={handleChange("first_name")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            autoComplete="given-name"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Last name
          </label>
          <input
            type="text"
            value={form.last_name ?? ""}
            onChange={handleChange("last_name")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            autoComplete="family-name"
          />
        </div>

        {/* Preferred name */}
        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs font-medium text-slate-700">
            Preferred name
          </label>
          <input
            type="text"
            value={form.preferred_name ?? ""}
            onChange={handleChange("preferred_name")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="What you call them day-to-day (optional)"
          />
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            value={form.email ?? ""}
            onChange={handleChange("email")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            autoComplete="email"
          />
        </div>

        {/* Mobile */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Mobile
          </label>
          <input
            type="tel"
            value={form.phone_mobile ?? ""}
            onChange={handleChange("phone_mobile")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            autoComplete="tel"
          />
        </div>

        {/* Home phone */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Home phone
          </label>
          <input
            type="tel"
            value={form.phone_home ?? ""}
            onChange={handleChange("phone_home")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Work phone */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Work phone
          </label>
          <input
            type="tel"
            value={form.phone_work ?? ""}
            onChange={handleChange("phone_work")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Street address */}
        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs font-medium text-slate-700">
            Street address
          </label>
          <input
            type="text"
            value={form.street_address ?? ""}
            onChange={handleChange("street_address")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            autoComplete="street-address"
          />
        </div>

        {/* Suburb */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Suburb
          </label>
          <input
            type="text"
            value={form.suburb ?? ""}
            onChange={handleChange("suburb")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {/* State */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            State
          </label>
          <input
            type="text"
            value={form.state ?? ""}
            onChange={handleChange("state")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Postcode */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Postcode
          </label>
          <input
            type="text"
            value={form.postcode ?? ""}
            onChange={handleChange("postcode")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Contact type */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Contact type
          </label>
          <select
            value={form.contact_type ?? ""}
            onChange={handleChange("contact_type")}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">—</option>
            <option value="owner">Owner</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="landlord">Landlord</option>
            <option value="tenant">Tenant</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Lead source */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Lead source
          </label>
          <input
            type="text"
            value={form.lead_source ?? ""}
            onChange={handleChange("lead_source")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Referral, signboard, REA, open home…"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs font-medium text-slate-700">
            Notes
          </label>
          <textarea
            value={form.notes ?? ""}
            onChange={handleChange("notes")}
            className="min-h-[80px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {deleting ? "Deleting…" : "Delete contact"}
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save contact"}
        </button>
      </div>
    </form>
  );
}
