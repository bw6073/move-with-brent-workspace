"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type SimpleContact = {
  id: number;
  name: string | null;
  preferred_name?: string | null;
  email?: string | null;
  phone_mobile?: string | null;
  phone?: string | null;
};

const getDisplayName = (c: SimpleContact) =>
  c.preferred_name || c.name || "Unnamed contact";

const getPhone = (c: SimpleContact) => c.phone_mobile || c.phone || "";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "seller", label: "Seller" },
  { value: "buyer", label: "Buyer" },
  { value: "tenant", label: "Tenant" },
  { value: "interested_buyer", label: "Interested buyer" },
  { value: "other", label: "Other" },
] as const;

export default function LinkContactPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = Number(params?.id);

  const [contacts, setContacts] = useState<SimpleContact[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [role, setRole] = useState<string>("owner");
  const [loadingList, setLoadingList] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial list
  useEffect(() => {
    if (!propertyId || Number.isNaN(propertyId)) return;

    let ignore = false;

    async function loadInitial() {
      setLoadingList(true);
      setError(null);

      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, preferred_name, email, phone_mobile, phone")
        .order("created_at", { ascending: false })
        .limit(25);

      if (ignore) return;

      if (error) {
        console.error("Failed to load contacts list:", error.message || error);
        setError("Could not load contacts.");
        setContacts([]);
      } else {
        setContacts((data || []) as SimpleContact[]);
      }
      setLoadingList(false);
    }

    void loadInitial();
    return () => {
      ignore = true;
    };
  }, [propertyId]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoadingList(true);
    setError(null);

    const term = search.trim();

    let query = supabase
      .from("contacts")
      .select("id, name, preferred_name, email, phone_mobile, phone")
      .order("created_at", { ascending: false })
      .limit(50);

    if (term) {
      // Simple OR search on name/email
      query = query.or(
        `name.ilike.%${term}%,preferred_name.ilike.%${term}%,email.ilike.%${term}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to search contacts:", error.message || error);
      setError("Search failed. Please try again.");
      setContacts([]);
    } else {
      setContacts((data || []) as SimpleContact[]);
    }

    setLoadingList(false);
  }

  async function handleLink() {
    if (!selectedId || !propertyId || Number.isNaN(propertyId)) {
      setError("Please select a contact to link.");
      return;
    }

    setLinking(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("You need to be signed in to link contacts.");
      setLinking(false);
      return;
    }

    const { error } = await supabase.from("property_contacts").insert({
      user_id: user.id,
      property_id: propertyId,
      contact_id: selectedId,
      role,
    });

    if (error) {
      console.error("Failed to link contact:", error.message || error);
      setError("Could not link contact. Please try again.");
      setLinking(false);
      return;
    }

    // Go back to property detail
    router.push(`/properties/${propertyId}`);
  }

  function handleCancel() {
    if (!propertyId || Number.isNaN(propertyId)) {
      router.push("/properties");
    } else {
      router.push(`/properties/${propertyId}`);
    }
  }

  if (!propertyId || Number.isNaN(propertyId)) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 text-sm text-red-600">
        Invalid property ID in URL.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6 space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Link contact to property
          </h1>
          <p className="text-xs text-slate-500">
            Choose an existing contact and set their role for this property.
          </p>
        </div>
      </header>

      {/* Search form */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <input
            type="text"
            placeholder="Search contacts by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-full border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
            disabled={loadingList}
          >
            {loadingList ? "Searching…" : "Search"}
          </button>
        </form>

        {/* Role selector */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-600">
            <span className="font-medium text-slate-700">
              Role for this property:
            </span>
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full max-w-xs rounded-full border border-slate-300 px-3 py-1.5 text-xs focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Contacts list */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        {error && <p className="text-xs text-red-600">{error}</p>}

        {contacts.length === 0 && !loadingList && (
          <p className="text-xs text-slate-500">
            No contacts found. You may need to{" "}
            <button
              type="button"
              onClick={() =>
                router.push(`/contacts/new?propertyId=${propertyId}`)
              }
              className="text-slate-900 underline"
            >
              create a new contact
            </button>
            .
          </p>
        )}

        {contacts.length > 0 && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {contacts.map((c) => {
              const name = getDisplayName(c);
              const phone = getPhone(c);
              const email = c.email || "";
              const selected = selectedId === c.id;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={
                    "w-full rounded-lg border px-3 py-2 text-left text-xs " +
                    (selected
                      ? "border-slate-900 bg-slate-900/5"
                      : "border-slate-200 hover:bg-slate-50")
                  }
                >
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900">
                        {name}
                      </div>
                      <div className="mt-0.5 space-y-0.5 text-[11px] text-slate-600">
                        {email && <div className="truncate">{email}</div>}
                        {phone && <div className="truncate">{phone}</div>}
                      </div>
                    </div>
                    {selected && (
                      <span className="shrink-0 text-[11px] text-slate-700">
                        Selected
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Actions */}
      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-full border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleLink}
          disabled={linking || !selectedId}
          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {linking ? "Linking…" : "Link contact"}
        </button>
      </div>
    </div>
  );
}
