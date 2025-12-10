// src/app/(app)/appraisals/[id]/edit/EditAppraisalClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import AppraisalForm from "@/components/appraisal/AppraisalForm";
import {
  EMPTY_FORM,
  type FormState,
} from "@/components/appraisal/config/types";

type EditAppraisalClientProps = {
  appraisalId: string; // from the URL segment
};

export default function EditAppraisalClient({
  appraisalId,
}: EditAppraisalClientProps) {
  const [initialForm, setInitialForm] = useState<FormState | null>(null);
  const [pk, setPk] = useState<number | null>(null); // DB primary key
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appraisalId) {
      setError("Invalid appraisal ID.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/appraisals?id=${encodeURIComponent(appraisalId)}`
        );

        const json = await res.json();

        if (!res.ok) {
          console.error("Failed to fetch appraisal", res.status, json);
          setError(json.error || "Failed to load appraisal.");
          return;
        }

        let row: any = null;

        if (json.appraisal) {
          row = json.appraisal;
        } else if (
          Array.isArray(json.appraisals) &&
          json.appraisals.length > 0
        ) {
          row = json.appraisals[0];
        } else if (Array.isArray(json) && json.length > 0) {
          row = json[0];
        } else if (json && typeof json === "object") {
          row = json;
        }

        console.log("[EditAppraisalClient] Loaded appraisal JSON:", json);
        console.log("[EditAppraisalClient] Resolved row:", row);

        if (!row) {
          setError("Appraisal not found.");
          return;
        }

        const rawData = (row.data || row.formState || {}) as Partial<FormState>;

        const merged: FormState = {
          ...EMPTY_FORM,
          ...rawData,
        };

        const fromRowIds = (row.contactIds ??
          rawData.contactIds ??
          []) as any[];

        merged.contactIds = fromRowIds
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n));

        const primaryKey = Number(row.id ?? appraisalId);

        setInitialForm(merged);
        setPk(Number.isFinite(primaryKey) ? primaryKey : null);
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
