// src/app/appraisals/[id]/edit/EditAppraisalClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import AppraisalForm from "@/components/appraisal/AppraisalForm";
import {
  EMPTY_FORM,
  type FormState,
} from "@/components/appraisal/config/types";

type EditAppraisalClientProps = {
  appraisalId: string; // from the URL (string)
};

export default function EditAppraisalClient({
  appraisalId,
}: EditAppraisalClientProps) {
  const [initialForm, setInitialForm] = useState<FormState | null>(null);
  const [pk, setPk] = useState<number | null>(null); // actual DB id
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appraisalId) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/appraisals/${appraisalId}`);

        if (!res.ok) {
          const text = await res.text();
          console.error("Failed to fetch appraisal", res.status, text);
          setError("Failed to load appraisal.");
          return;
        }

        const json = await res.json();

        // Tolerate different shapes: either { appraisal: {...} } or direct row
        const row = (json.appraisal ?? json) as any;

        if (!row) {
          setError("Appraisal not found.");
          return;
        }

        const rawData = (row.data || {}) as Partial<FormState>;

        // Merge with EMPTY_FORM so all fields exist
        const merged: FormState = {
          ...EMPTY_FORM,
          ...rawData,
        };

        // Normalise contactIds → number[]
        const fromRowIds = (row.contactIds ??
          rawData.contactIds ??
          []) as any[];

        merged.contactIds = fromRowIds
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n));

        setInitialForm(merged);
        setPk(Number(row.id ?? appraisalId));
      } catch (err) {
        console.error("Error loading appraisal", err);
        setError("Unexpected error loading appraisal.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [appraisalId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-10 text-sm text-slate-600">
          Loading appraisal…
        </div>
      </div>
    );
  }

  if (error || !initialForm || pk === null) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-10 text-sm text-red-600">
          {error || "Appraisal not found."}
        </div>
      </div>
    );
  }

  return (
    <AppraisalForm
      mode="edit"
      appraisalId={pk}
      initialForm={initialForm}
      prefillContact={null}
    />
  );
}
