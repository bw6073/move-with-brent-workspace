// src/app/contacts/new/page.tsx
import React, { Suspense } from "react";
import NewContactPageClient from "./NewContactPageClient";

export default function NewContactPage() {
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}
    >
      <NewContactPageClient />
    </Suspense>
  );
}
