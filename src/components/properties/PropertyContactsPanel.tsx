"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Props = {
  propertyId: number;
};

type LinkedContactRow = {
  id: number; // link row id (property_contacts.id)
  role: string | null;
  contacts: {
    id: number;
    name: string | null;
    preferred_name?: string | null;
    email?: string | null;
    phone_mobile?: string | null;
    phone?: string | null;
  } | null;
};

const getDisplayName = (c: LinkedContactRow["contacts"]) => {
  if (!c) return "Unknown contact";
  return c.preferred_name || c.name || "Unnamed contact";
};

const getPhone = (c: LinkedContactRow["contacts"]) => {
  if (!c) return "";
  return c.phone_mobile || c.phone || "";
};

export function PropertyContactsPanel({ propertyId }: Props) {
  const [rows, setRows] = useState<LinkedContactRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadLinked() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("property_contacts")
        .select(
          `
          id,
          role,
          contacts:contacts (
            id,
            name,
            preferred_name,
            email,
            phone_mobile,
            phone
          )
        `
        )
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });

      if (ignore) return;

      if (error) {
        console.error(
          "Failed to load linked contacts:",
          error.message || error
        );
        setError("Could not load linked contacts.");
        setRows([]);
      } else {
        setRows((data || []) as unknown as LinkedContactRow[]);
      }
      setLoading(false);
    }

    void loadLinked();
    return () => {
      ignore = true;
    };
  }, [propertyId]);

  async function handleUnlink(linkId: number) {
    if (!window.confirm("Remove this contact link from the property?")) {
      return;
    }

    setUnlinkingId(linkId);

    const { error } = await supabase
      .from("property_contacts")
      .delete()
      .eq("id", linkId);

    if (error) {
      console.error("Failed to unlink contact:", error.message || error);
      setUnlinkingId(null);
      return;
    }

    setRows((current) => current.filter((r) => r.id !== linkId));
    setUnlinkingId(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Contacts
        </h3>
        <Link
          href={`/properties/${propertyId}/link-contact`}
          className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-700"
        >
          + Link / add contact
        </Link>
      </div>

      {loading && <p className="text-xs text-slate-500">Loading contacts…</p>}

      {error && !loading && <p className="text-xs text-red-600">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="text-xs text-slate-500">
          No contacts linked to this property yet. Link vendor(s), buyers or
          other key people here.
        </p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((row) => {
            const c = row.contacts;
            const name = getDisplayName(c);
            const phone = getPhone(c);
            const email = c?.email || "";
            const href = c ? `/contacts/${c.id}` : "#";

            return (
              <Link
                key={row.id}
                href={href}
                className="block rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-900">
                      {name}
                    </div>
                    {row.role && (
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {row.role}
                      </div>
                    )}
                    <div className="mt-1 space-y-0.5 text-[11px] text-slate-600">
                      {email && <div className="truncate">{email}</div>}
                      {phone && <div className="truncate">{phone}</div>}
                    </div>
                  </div>
                </div>

                {/* Unlink button */}
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault(); // don’t navigate
                      void handleUnlink(row.id);
                    }}
                    className="text-[11px] text-red-600 hover:underline disabled:opacity-60"
                    disabled={unlinkingId === row.id}
                  >
                    {unlinkingId === row.id ? "Removing…" : "Remove link"}
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
