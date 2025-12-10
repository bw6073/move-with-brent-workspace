// src/app/(app)/contacts/page.tsx
import React from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";
import { ContactsTable } from "./ContactsTable";

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
    .eq("user_id", user.id);

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
    const firstName = c.first_name ?? "";
    const lastName = c.last_name ?? "";

    const fullName =
      c.full_name ||
      [firstName, lastName].filter(Boolean).join(" ") ||
      c.preferred_name ||
      c.name ||
      "Unnamed contact";

    const phone = c.phone_mobile || c.mobile || c.phone || "";

    const createdRaw = c.created_at ?? null;
    const created = createdRaw
      ? new Date(createdRaw).toLocaleDateString("en-AU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";

    return {
      id: c.id,
      email: c.email ?? "",
      phone,
      fullName,
      firstName,
      lastName,
      createdRaw,
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

      {/* TABLE + SORT + PAGINATION (client side) */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <ContactsTable contacts={contacts} />
      </section>
    </div>
  );
}
