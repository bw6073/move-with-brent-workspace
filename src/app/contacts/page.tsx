// src/app/contacts/page.tsx
import React from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";

type ContactRow = {
  id: number;
  full_name?: string | null;
  name?: string | null;
  preferred_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_mobile?: string | null;
  mobile?: string | null;
  phone?: string | null;
  created_at?: string | null;
  [key: string]: any;
};

export default async function ContactsPage() {
  const { user, supabase } = await requireUser();

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load contacts:", error);

    return (
      <div className="mx-auto max-w-5xl px-6 py-6">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Contacts</h1>
            <p className="text-sm text-slate-500">
              People in your database. Open a contact to view or create
              appraisals.
            </p>
          </div>
        </header>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          There was a problem loading contacts. Please check your Supabase
          table.
        </div>
      </div>
    );
  }

  const rows: ContactRow[] = (data ?? []) as ContactRow[];

  const contacts = rows.map((c) => {
    const displayName =
      c.preferred_name ||
      c.full_name ||
      c.name ||
      [c.first_name, c.last_name].filter(Boolean).join(" ") ||
      "Unnamed contact";

    const phone = c.phone_mobile || c.mobile || c.phone || "";

    const created = c.created_at
      ? new Date(c.created_at).toLocaleDateString("en-AU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";

    return {
      ...c,
      displayName,
      phone,
      created,
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* HEADER */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Contacts</h1>
          <p className="text-sm text-slate-500">
            People in your database. Open a contact to view or create
            appraisals.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/contacts/new"
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            + New contact
          </Link>
          <Link
            href="/appraisals/new"
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            + New appraisal
          </Link>
        </div>
      </header>

      {/* TABLE */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {contacts.length === 0 ? (
          <p className="text-sm text-slate-500">
            No contacts yet. Click &ldquo;New contact&rdquo; to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 px-4">Email</th>
                  <th className="py-2 px-4">Phone</th>
                  <th className="py-2 px-4">Created</th>
                  <th className="py-2 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="py-2 pr-4 text-slate-900">
                      <Link
                        href={`/contacts/${c.id}`}
                        className="hover:underline"
                      >
                        {c.displayName}
                      </Link>
                    </td>
                    <td className="py-2 px-4 text-slate-700">
                      {c.email || "—"}
                    </td>
                    <td className="py-2 px-4 text-slate-700">
                      {c.phone || "—"}
                    </td>
                    <td className="py-2 px-4 text-slate-700">{c.created}</td>
                    <td className="py-2 pl-4 text-right">
                      <div className="flex justify-end gap-2 text-xs">
                        <Link
                          href={`/contacts/${c.id}`}
                          className="rounded-full border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
                        >
                          View
                        </Link>
                        <Link
                          href={`/appraisals/new?contactId=${c.id}`}
                          className="rounded-full border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
                        >
                          New appraisal
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
