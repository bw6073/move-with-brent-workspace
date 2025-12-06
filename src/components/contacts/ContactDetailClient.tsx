// src/components/contacts/ContactDetailClient.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";

import { ContactEditForm, type Contact } from "./ContactEditForm";
import ContactAppraisalsCard from "./ContactAppraisalsCard";
import { ContactNotesCard } from "./ContactNotesCard";
import { ContactActivityCard } from "./ContactActivityCard";
import { ContactTasksCard } from "./ContactTasksCard";
import { ContactTimelineCard } from "./ContactTimelineCard";
import { ContactLinkedContactsCard } from "./ContactLinkedContactsCard";

type Props = {
  initialContact: Contact;
};

const getDisplayName = (c: Contact): string =>
  c.preferred_name ||
  c.name ||
  [c.first_name, c.last_name].filter(Boolean).join(" ") ||
  "Unnamed contact";

type RightTab =
  | "timeline"
  | "activity"
  | "appraisals"
  | "tasks"
  | "notes"
  | "linked";

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const date = d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const time = d.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${date} ${time}`;
};

export default function ContactDetailClient({ initialContact }: Props) {
  const [contact, setContact] = useState<Contact>(initialContact);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<RightTab>("timeline");

  const handleContactUpdated = (updated: Contact) => {
    setContact(updated);
    setEditing(false);
  };

  const displayName = getDisplayName(contact);
  const fullName =
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    contact.name ||
    "—";

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* HEADER */}
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {displayName}
          </h1>
          <p className="text-sm text-slate-500">
            Contact details, history & linked appraisals
          </p>
        </div>

        <Link
          href="/contacts"
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
        >
          ← Back to contacts
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
        {/* LEFT: read-only profile OR edit form */}
        <section className="space-y-4">
          {!editing ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  Contact details
                </h2>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Edit contact
                </button>
              </div>

              <dl className="space-y-2 text-sm text-slate-700">
                {/* Name / preferred name */}
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Name
                  </dt>
                  <dd>{fullName}</dd>
                </div>

                {contact.preferred_name && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Preferred name
                    </dt>
                    <dd>{contact.preferred_name}</dd>
                  </div>
                )}

                {/* Email */}
                {contact.email && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Email
                    </dt>
                    <dd>{contact.email}</dd>
                  </div>
                )}

                {/* Phones */}
                {(contact.phone_mobile ||
                  contact.phone_home ||
                  contact.phone_work ||
                  contact.phone) && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Phone
                    </dt>
                    <dd className="space-y-0.5">
                      {contact.phone_mobile && (
                        <div>
                          <span className="text-[11px] uppercase text-slate-500">
                            Mobile:
                          </span>{" "}
                          {contact.phone_mobile}
                        </div>
                      )}
                      {contact.phone_home && (
                        <div>
                          <span className="text-[11px] uppercase text-slate-500">
                            Home:
                          </span>{" "}
                          {contact.phone_home}
                        </div>
                      )}
                      {contact.phone_work && (
                        <div>
                          <span className="text-[11px] uppercase text-slate-500">
                            Work:
                          </span>{" "}
                          {contact.phone_work}
                        </div>
                      )}
                      {contact.phone &&
                        !(
                          contact.phone_mobile ||
                          contact.phone_home ||
                          contact.phone_work
                        ) && (
                          <div>
                            <span className="text-[11px] uppercase text-slate-500">
                              Phone:
                            </span>{" "}
                            {contact.phone}
                          </div>
                        )}
                    </dd>
                  </div>
                )}

                {/* Address */}
                {(contact.street_address ||
                  contact.suburb ||
                  contact.state ||
                  contact.postcode) && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Address
                    </dt>
                    <dd>
                      {contact.street_address}
                      {contact.suburb ? `, ${contact.suburb}` : ""}
                      {contact.state ? ` ${contact.state}` : ""}
                      {contact.postcode ? ` ${contact.postcode}` : ""}
                    </dd>
                  </div>
                )}

                {/* Contact type */}
                {contact.contact_type && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Contact type
                    </dt>
                    <dd>{contact.contact_type}</dd>
                  </div>
                )}

                {/* Lead source */}
                {contact.lead_source && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Lead source
                    </dt>
                    <dd>{contact.lead_source}</dd>
                  </div>
                )}

                {/* Notes */}
                {contact.notes && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Notes
                    </dt>
                    <dd className="whitespace-pre-wrap text-slate-700">
                      {contact.notes}
                    </dd>
                  </div>
                )}

                {/* Meta */}
                <div className="space-y-0.5 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                  <div>
                    <span className="font-semibold">Created:</span>{" "}
                    {formatDate(contact.created_at)}
                  </div>
                  <div>
                    <span className="font-semibold">Last updated:</span>{" "}
                    {formatDate(contact.updated_at)}
                  </div>
                </div>
              </dl>
            </div>
          ) : (
            <ContactEditForm
              contact={contact}
              onUpdated={handleContactUpdated}
            />
          )}
        </section>

        {/* RIGHT: tabbed panel */}
        <section className="space-y-3">
          <div className="flex flex-wrap gap-1 text-xs">
            {[
              { id: "timeline", label: "Timeline" },
              { id: "tasks", label: "Tasks" },
              { id: "activity", label: "Activity" },
              { id: "appraisals", label: "Appraisals" },
              { id: "notes", label: "Notes" },
              { id: "linked", label: "Linked contacts" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as RightTab)}
                className={[
                  "rounded-full border px-3 py-1.5",
                  activeTab === tab.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {activeTab === "timeline" && (
              <ContactTimelineCard contactId={contact.id} />
            )}
            {activeTab === "tasks" && (
              <ContactTasksCard contactId={contact.id} />
            )}
            {activeTab === "activity" && (
              <ContactActivityCard contactId={contact.id} />
            )}
            {activeTab === "appraisals" && (
              <ContactAppraisalsCard contactId={contact.id} />
            )}
            {activeTab === "notes" && (
              <ContactNotesCard contactId={contact.id} />
            )}
            {activeTab === "linked" && (
              <ContactLinkedContactsCard contactId={contact.id} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
