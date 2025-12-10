// src/app/contacts/[id]/edit/page.tsx
import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ContactEditForm,
  type Contact,
} from "@/components/contacts/ContactEditForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContactEditPage({ params }: PageProps) {
  const { id } = await params;
  const contactId = Number(id);

  if (Number.isNaN(contactId)) {
    return <div>Invalid contact ID</div>;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return <div>Unauthorised</div>;
  }

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .eq("user_id", user.id)
    .single<Contact>();

  if (error || !data) {
    console.error("Failed to load contact for edit", error);
    return <div>Contact not found.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Edit contact
          </h1>
          <p className="text-sm text-slate-500">
            Update contact details and save changes.
          </p>
        </div>

        <Link
          href={`/contacts/${contactId}`}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
        >
          ← Back to contact
        </Link>
      </header>

      <ContactEditForm contact={data} />
    </div>
  );
}
