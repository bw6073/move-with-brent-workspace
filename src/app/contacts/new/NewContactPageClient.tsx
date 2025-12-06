// src/app/contacts/new/NewContactPageClient.tsx
"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function NewContactPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyIdParam = searchParams.get("propertyId");
  const propertyId = propertyIdParam ? Number(propertyIdParam) : null;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneMobile, setPhoneMobile] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("You must be signed in to create contacts.");
      setSaving(false);
      return;
    }

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedPreferred = preferredName.trim();

    const fullName = `${trimmedFirst} ${trimmedLast}`
      .trim()
      .replace(/\s+/g, " ");

    // Rule C: preferred_name || name || (first + last)
    const displayName = trimmedPreferred || fullName || "" || null;

    // 1) Insert contact
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .insert({
        user_id: user.id,
        first_name: trimmedFirst || null,
        last_name: trimmedLast || null,
        preferred_name: trimmedPreferred || null,
        name: displayName,
        email: email.trim() || null,
        phone_mobile: phoneMobile.trim() || null,
        phone: phone.trim() || null,
      })
      .select("*")
      .single();

    if (contactError || !contact) {
      console.error("Failed to create contact:", contactError || contact);
      setError("Could not create contact. Please try again.");
      setSaving(false);
      return;
    }

    // 2) If propertyId present, link contact to that property
    if (propertyId && !Number.isNaN(propertyId)) {
      const { error: linkError } = await supabase
        .from("property_contacts")
        .insert({
          user_id: user.id,
          property_id: propertyId,
          contact_id: contact.id,
          role: "owner",
        });

      if (linkError) {
        console.error("Failed to auto-link contact to property:", linkError);
      }
    }

    // 3) Redirect
    if (propertyId && !Number.isNaN(propertyId)) {
      router.push(`/properties/${propertyId}`);
    } else {
      router.push("/contacts");
    }
  }

  function handleCancel() {
    if (propertyId && !Number.isNaN(propertyId)) {
      router.push(`/properties/${propertyId}`);
    } else {
      router.push("/contacts");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-slate-900">New contact</h1>
        {propertyId && !Number.isNaN(propertyId) && (
          <p className="text-xs text-slate-500">
            This contact will be automatically linked to property #{propertyId}.
          </p>
        )}
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-sm"
      >
        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-slate-600">
              First name
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-slate-600">
              Last name
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-slate-600">
              Preferred name (optional)
            </label>
            <input
              type="text"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              placeholder="E.g. Mitch"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">
              Mobile
            </label>
            <input
              type="tel"
              value={phoneMobile}
              onChange={(e) => setPhoneMobile(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">
              Phone (other)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>

        <div className="flex justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
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
    </div>
  );
}
