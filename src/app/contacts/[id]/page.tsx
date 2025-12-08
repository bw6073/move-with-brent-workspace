// src/app/contacts/[id]/page.tsx
import React from "react";
import { createClient } from "@/lib/supabase/server";
import ContactDetailClient from "@/components/contacts/ContactDetailClient";
import type { Contact } from "@/components/contacts/ContactEditForm";
import type { ContactOpenHomeActivity } from "@/components/contacts/ContactOpenHomeTimeline";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContactDetailPage(props: PageProps) {
  const { id } = await props.params;
  const contactId = Number(id);

  if (Number.isNaN(contactId)) {
    return <div>Invalid contact ID</div>;
  }

  const supabase = await createClient();

  // Auth
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("No authenticated user in /contacts/[id]", userError);
    return <div>Unauthorised</div>;
  }

  // 1) Load contact
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
    console.error("Failed to load contact", error);
    return <div>Contact not found.</div>;
  }

  // 2) Load open-home attendance for this contact
  const { data: attendanceRows, error: attendanceError } = await supabase
    .from("open_home_attendees")
    .select(
      `
      id,
      event_id,
      created_at,
      notes,
      is_buyer,
      is_seller,
      lead_source,
      lead_source_other,
      open_home_events!inner(
        id,
        title,
        start_at,
        properties (
          id,
          street_address,
          suburb,
          state,
          postcode
        )
      )
    `
    )
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (attendanceError) {
    console.error("Failed to load open-home attendance", attendanceError);
  }

  const openHomeActivities: ContactOpenHomeActivity[] = (
    attendanceRows ?? []
  ).map((row: any) => {
    const event = row.open_home_events;
    const property = event?.properties;

    const propertyLabel = property
      ? `${property.street_address}, ${property.suburb} ${property.state} ${property.postcode}`
      : "Unknown property";

    const roleLabel =
      row.is_buyer && row.is_seller
        ? "Buyer & Seller"
        : row.is_buyer
        ? "Buyer"
        : row.is_seller
        ? "Seller"
        : "—";

    // prefer event.start_at for attendedAt, fallback to attendee.created_at
    const attendedAt = event?.start_at ?? row.created_at ?? null;

    return {
      attendeeId: row.id as string,
      eventId: event?.id ?? "",
      eventTitle: event?.title ?? "Open home",
      propertyLabel,
      propertyId: property?.id ?? null,
      attendedAt,
      roleLabel,
      leadSource: row.lead_source ?? row.lead_source_other ?? null,
      notes: row.notes ?? null,
    };
  });

  return (
    <ContactDetailClient
      initialContact={data}
      openHomeActivities={openHomeActivities}
    />
  );
}
