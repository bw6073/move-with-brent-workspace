// src/components/ContactForm.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type ContactFormProps = {
  initialContact?: {
    id?: number;
    name: string;
    email: string;
    phone?: string;
  } | null;
};

export default function ContactForm({ initialContact }: ContactFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialContact?.name ?? "");
  const [email, setEmail] = useState(initialContact?.email ?? "");
  const [phone, setPhone] = useState(initialContact?.phone ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const isEdit = !!initialContact?.id;

      const url = isEdit
        ? `/api/contacts/${initialContact!.id}`
        : "/api/contacts";

      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Save contact error:", res.status, text);
        alert("Failed to save contact.");
        setSaving(false);
        return;
      }

      const json = await res.json();
      const id = json.id ?? initialContact?.id;

      // Go back to contacts or that contact’s page
      if (id) {
        router.push(`/contacts/${id}`);
      } else {
        router.push("/contacts");
      }
    } catch (err) {
      console.error("Unexpected contact save error:", err);
      alert("Unexpected error saving contact.");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* your existing inputs */}
    </form>
  );
}
