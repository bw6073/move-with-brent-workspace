// app/(app)/open-homes/[eventId]/DeleteEventButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const ok = window.confirm(
      "Delete this open home and all its attendees? This cannot be undone."
    );
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/open-homes/${eventId}`, {
        method: "DELETE",
      });

      if (!res.ok && res.status !== 204) {
        console.error("Failed to delete event", await res.text());
        alert("Something went wrong deleting the open home.");
        return;
      }

      router.push("/open-homes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center rounded-full border border-red-300 text-red-600 text-sm font-medium px-3 py-1.5 hover:bg-red-50 disabled:opacity-60"
    >
      {loading ? "Deleting…" : "Delete"}
    </button>
  );
}
