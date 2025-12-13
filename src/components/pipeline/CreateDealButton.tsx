"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { Deal } from "./PipelineBoard";

type Props = {
  contactId?: number;
  propertyId?: number;
  appraisalId?: number;
  defaultTitle: string;
  defaultStage?: Deal["stage"];
  size?: "sm" | "md";
};

export function CreateDealButton({
  contactId,
  propertyId,
  appraisalId,
  defaultTitle,
  defaultStage = "lead",
  size = "sm",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: defaultTitle,
          stage: defaultStage,
          contact_id: contactId ?? null,
          property_id: propertyId ?? null,
          appraisal_id: appraisalId ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create deal");
      }

      const data = await res.json();
      const deal = data.deal as Deal;

      // After creating, send you to the deal (or pipeline)
      router.push(`/pipeline/${deal.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to create deal");
      setLoading(false);
    }
  };

  const baseClasses =
    "inline-flex items-center rounded-lg border text-xs font-medium shadow-sm";
  const sizeClasses = size === "sm" ? "px-2.5 py-1.5" : "px-3 py-2 text-sm";

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`${baseClasses} ${sizeClasses} border-slate-200 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-60`}
      >
        {loading ? "Adding…" : "Add to pipeline"}
      </button>
      {error && (
        <span className="text-[10px] text-red-600 max-w-xs">{error}</span>
      )}
    </div>
  );
}
