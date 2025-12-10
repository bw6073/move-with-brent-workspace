// src/app/(app)/appraisals/page.tsx
import React from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";
import { AppraisalsTable } from "./AppraisalsTable";

type AppraisalRow = {
  id: number;
  title?: string | null;
  appraisalTitle?: string | null;
  street_address?: string | null;
  streetAddress?: string | null;
  suburb?: string | null;
  status?: string | null;
  created_at?: string | null;
  // JSON form state – newer appraisals likely use this
  data?: any;
  formState?: any;
  [key: string]: any;
};

export default async function AppraisalsPage() {
  const { user, supabase } = await requireUser();

  const { data, error } = await supabase
    .from("appraisals")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to load appraisals:", error);

    return (
      <div className="mx-auto max-w-5xl px-6 py-6">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Appraisals
            </h1>
            <p className="text-sm text-slate-500">
              Property appraisals you have created.
            </p>
          </div>
        </header>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          There was a problem loading appraisals. Please check your Supabase
          table.
        </div>
      </div>
    );
  }

  const rows: AppraisalRow[] = (data ?? []) as AppraisalRow[];

  const appraisals = rows.map((a) => {
    // Pull any stored form state out of the JSON column
    const rawData = (a.data || a.formState || {}) as any;

    // TITLE – try JSON first, then flat columns
    const title =
      rawData.appraisalTitle ||
      rawData.title ||
      rawData.propertyTitle ||
      a.appraisalTitle ||
      a.title ||
      "Untitled appraisal";

    // STREET / ADDRESS – try JSON first, then flat columns
    const street =
      rawData.streetAddress ||
      rawData.propertyStreet ||
      rawData.propertyAddress ||
      a.street_address ||
      a.streetAddress ||
      "";

    // SUBURB – same idea
    const suburb =
      rawData.suburb ||
      rawData.propertySuburb ||
      rawData.locality ||
      a.suburb ||
      "";

    const address = [street, suburb].filter(Boolean).join(", ");

    const status =
      rawData.status || rawData.appraisalStatus || a.status || "Draft";

    const createdRaw = a.created_at ?? null;
    const created = createdRaw
      ? new Date(createdRaw).toLocaleDateString("en-AU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";

    return {
      id: a.id,
      title,
      address,
      suburb,
      status,
      createdRaw,
      created,
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* HEADER */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Appraisals</h1>
          <p className="text-sm text-slate-500">
            Property appraisals in your CRM.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/appraisals/new"
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            + New appraisal
          </Link>
        </div>
      </header>

      {/* TABLE */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <AppraisalsTable appraisals={appraisals} />
      </section>
    </div>
  );
}
