// src/components/contacts/ContactLinkedContactsCard.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type LinkedContact = {
  id: number;
  contact_id: number;
  linked_contact_id: number;
  created_at: string | null;
  linked?: {
    id: number;
    name: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone_mobile?: string | null;
    phone?: string | null;
  } | null;
};

type Props = {
  contactId: number;
};

const displayNameFromLinked = (c: LinkedContact["linked"]): string => {
  if (!c) return "Unnamed contact";

  const baseName =
    c.name || [c.first_name, c.last_name].filter(Boolean).join(" ") || null;

  return baseName || "Unnamed contact";
};

export function ContactLinkedContactsCard({ contactId }: Props) {
  const [links, setLinks] = useState<LinkedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For adding a link
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);

  const loadLinks = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/contact-links?contactId=${contactId}`);

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Failed to load linked contacts:", txt);
        setError("Could not load linked contacts.");
        setLinks([]);
        return;
      }

      const json = await res.json().catch(() => null);
      const list: LinkedContact[] = Array.isArray(json?.links)
        ? json.links
        : [];

      setLinks(list);
    } catch (err) {
      console.error("Unexpected error loading linked contacts", err);
      setError("Could not load linked contacts.");
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLinks();
  }, [contactId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    try {
      setSearching(true);
      setError(null);

      const params = new URLSearchParams({ q: searchTerm.trim() });
      const res = await fetch(`/api/contacts/search?${params.toString()}`);

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Contact search failed:", txt);
        setError("Could not search contacts.");
        setSearchResults([]);
        return;
      }

      const json = await res.json().catch(() => null);
      const items: any[] = Array.isArray(json?.items) ? json.items : [];

      setSearchResults(items);
    } catch (err) {
      console.error("Unexpected search error", err);
      setError("Could not search contacts.");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddLink = async (linkedContactId: number) => {
    if (adding) return;

    try {
      setAdding(true);
      setError(null);

      const res = await fetch("/api/contact-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          linked_contact_id: linkedContactId,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Failed to create linked contact:", txt);
        setError("Could not create link.");
        return;
      }

      // Reload links
      await loadLinks();
      setSearchTerm("");
      setSearchResults([]);
    } catch (err) {
      console.error("Unexpected error creating link", err);
      setError("Could not create link.");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteLink = async (linkId: number) => {
    const confirmed = window.confirm("Remove this linked contact?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/contact-links/${linkId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Failed to delete linked contact:", txt);
        alert("Could not remove link.");
        return;
      }

      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (err) {
      console.error("Unexpected error deleting link", err);
      alert("Could not remove link.");
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Linked contacts
          </h2>
          <p className="text-xs text-slate-500">
            Partners, household members or related parties linked to this
            contact.
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-2 text-xs text-red-600">
          {error} (you can still add new links below)
        </p>
      )}

      {loading && !error && (
        <p className="mb-2 text-xs text-slate-500">Loading linked contacts…</p>
      )}

      {/* Existing links */}
      {!loading && links.length === 0 && !error && (
        <p className="mb-3 text-xs text-slate-500">
          No linked contacts yet. Use the search below to add one.
        </p>
      )}

      {!loading && links.length > 0 && (
        <ul className="mb-4 space-y-2 text-xs">
          {links.map((link) => {
            const linked = link.linked ?? null;
            const displayName = displayNameFromLinked(linked);
            const email = linked?.email ?? null;
            const phone = linked?.phone_mobile || linked?.phone || null;

            return (
              <li
                key={link.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-900">
                    <Link
                      href={`/contacts/${linked?.id}`}
                      className="hover:underline"
                    >
                      {displayName}
                    </Link>
                  </div>

                  <div className="truncate text-[11px] text-slate-500">
                    {email || phone || "No contact details"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteLink(link.id)}
                  className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add link form */}
      <form onSubmit={handleSearch} className="space-y-2 text-xs">
        <label className="block text-[11px] font-medium text-slate-600">
          Link another contact
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search contacts by name, email or phone…"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="mt-3 space-y-1 text-xs">
          <p className="text-[11px] font-medium text-slate-600">
            Search results
          </p>
          <ul className="space-y-1">
            {searchResults.map((c) => {
              const displayName =
                c.name ||
                [c.first_name, c.last_name].filter(Boolean).join(" ") ||
                "Unnamed contact";

              const email = c.email ?? null;
              const phone = c.phone_mobile || c.mobile || c.phone || null;

              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-1.5"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900">
                      {displayName}
                    </div>
                    <div className="truncate text-[11px] text-slate-500">
                      {email || phone || "No contact details"}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={adding}
                    onClick={() => handleAddLink(c.id)}
                    className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                  >
                    Link
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
