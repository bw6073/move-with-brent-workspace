// src/app/(app)/appraisals/[id]/SyncAppraisalCalendarButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncAppraisalCalendarButton({
  appraisalId,
}: {
  appraisalId: number | string;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  const onSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/appraisals/${appraisalId}/sync-calendar`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(json?.error || "Failed to sync to Google Calendar.");
        return;
      }

      router.refresh();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onSync}
      disabled={syncing}
      className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
    >
      {syncing ? "Syncing…" : "Sync to Google Calendar"}
    </button>
  );
}
