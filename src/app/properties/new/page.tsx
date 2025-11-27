import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PropertyForm } from "@/components/properties/PropertyForm";

export default async function NewPropertyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10 text-sm text-slate-600">
        Unauthorised – please sign in.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6 space-y-4">
      {/* HEADER */}
      <header className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            New property
          </h1>
          <p className="text-sm text-slate-500">
            Record a property once, then link contacts, appraisals and tasks to
            it as you go.
          </p>
        </div>

        <Link
          href="/properties"
          className="rounded-full border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          ← Back to properties
        </Link>
      </header>

      {/* FORM */}
      <PropertyForm mode="create" />
    </div>
  );
}
