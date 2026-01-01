// src/app/(app)/appraisals/[id]/edit/EditAppraisalClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import AppraisalForm from "@/components/appraisal/AppraisalForm";
import type { FormState } from "@/components/appraisal/config/types";
import { EMPTY_FORM } from "@/components/appraisal/config/types";

type EditAppraisalClientProps = {
  appraisalId: string; // from the URL segment
};

type AppraisalApiRow = {
  id: number | string;
  user_id?: string;
  data?: Partial<FormState> | null;
  google_event_id?: string | null;
};

export default function EditAppraisalClient({
  appraisalId,
}: EditAppraisalClientProps) {
  const [initialForm, setInitialForm] = useState<FormState | null>(null);
  const [pk, setPk] = useState<number | null>(null); // DB primary key

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useMemo(() => {
    return async () => {
      if (!appraisalId || appraisalId === "undefined") {
        setError("Invalid appraisal ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/appraisals/${appraisalId}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          console.error("Failed to fetch appraisal", res.status, json);
          setError(json?.error || "Failed to load appraisal.");
          return;
        }

        const row: AppraisalApiRow | null = (json.appraisal ?? json) || null;

        if (!row) {
          setError("Appraisal not found.");
          return;
        }

        const rawData = (row.data ?? {}) as Partial<FormState>;

        const merged: FormState = {
          ...EMPTY_FORM,
          ...rawData,
        };

        // normalise contactIds into numbers (AppraisalForm expects numbers)
        const fromRowIds = (rawData.contactIds ?? []) as any[];
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
  }, [appraisalId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

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
