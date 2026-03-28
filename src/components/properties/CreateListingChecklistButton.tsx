"use client";

import React, { useState } from "react";
import { toastSuccess, toastError } from "@/lib/toast";

type Props = {
  propertyId: number;
  onCreated?: () => void;
};

export function CreateListingChecklistButton({ propertyId, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleCreate = async () => {
    if (!window.confirm("Create a listing preparation checklist (10 tasks) for this property?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/create-listing-checklist`, {
        method: "POST",
      });
      if (res.ok) {
        const json = await res.json();
        toastSuccess(`${json.created} listing tasks created.`);
        setDone(true);
        onCreated?.();
      } else {
        const json = await res.json().catch(() => ({}));
        toastError(json.error ?? "Failed to create checklist.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCreate}
      disabled={loading || done}
      className="rounded-full border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
    >
      {loading ? "Creating…" : done ? "Checklist created ✓" : "Create listing checklist"}
    </button>
  );
}
