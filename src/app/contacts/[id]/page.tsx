// src/app/contacts/[id]/page.tsx
import React from "react";
import { createClient } from "@/lib/supabase/server";
import ContactDetailClient from "@/components/contacts/ContactDetailClient";
import type { Contact } from "@/components/contacts/ContactEditForm";

type PageProps = {
  params: Promise<{ id: string }>; // Next 16: params is a Promise
};

export default async function ContactDetailPage(props: PageProps) {
  const { id } = await props.params;
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
    console.error("No authenticated user in /contacts/[id]", userError);
    return <div>Unauthorised</div>;
  }

  const { data, error } = await supabase
    .from("contacts")
    .select(
      `
      id,
      name,
      preferred_name,
      first_name,
      last_name,
      email,
      phone_mobile,
      phone_home,
      phone_work,
      phone,
      street_address,
      suburb,
      state,
      postcode,
      postal_address,
      contact_type,
      lead_source,
      notes,
      created_at,
      updated_at
    `
    )
    .eq("id", contactId)
    .eq("user_id", user.id)
    .single<Contact>();

  if (error || !data) {
    console.error("Failed to load contact", JSON.stringify(error, null, 2));
    return <div>Contact not found.</div>;
  }

  return <ContactDetailClient initialContact={data} />;
}
