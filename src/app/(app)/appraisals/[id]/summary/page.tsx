// src/app/(app)/appraisals/[id]/summary/page.tsx
import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";
import {
  EMPTY_FORM,
  type FormState,
} from "@/components/appraisal/config/types";
import { AppraisalSummaryClient } from "./AppraisalSummaryClient";
import { AppraisalPhotoPrintGrid } from "@/components/appraisal/AppraisalPhotoPrintGrid";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

type AppraisalRow = {
  id: number;
  status: string | null;
  data: unknown;
  created_at: string | null;
  updated_at: string | null;
};

function parseId(id: string) {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

export default async function AppraisalSummaryPage(props: PageProps) {
  const { id } = await props.params;
  const appraisalId = parseId(id);

  if (!appraisalId) notFound();

  const { user, supabase } = await requireUser();

  const { data, error } = await supabase
    .from("appraisals")
    .select("id, status, data, created_at, updated_at")
    .eq("id", appraisalId)
    .eq("user_id", user.id)
    .single<AppraisalRow>();

  if (error || !data) {
    console.error("[summary] failed to load appraisal", error);
    notFound();
  }

  const rawForm = (data.data ?? {}) as Partial<FormState>;

  const form: FormState = {
    ...EMPTY_FORM,
    ...rawForm,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Appraisal summary
            </h1>
            <p className="text-xs text-slate-500">
              Appraisal #{data.id} · {data.status ?? "DRAFT"}
            </p>
          </div>

          <Link
            href={`/appraisals/${data.id}/edit`}
            className="no-print rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            ← Back to appraisal
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-6">
        <AppraisalSummaryClient appraisal={data} form={form} />
        <AppraisalPhotoPrintGrid appraisalId={data.id} />
      </main>
    </div>
  );
}
