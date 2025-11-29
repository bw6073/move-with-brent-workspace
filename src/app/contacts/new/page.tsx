// app/contacts/new/page.tsx
import React, { Suspense } from "react";
import { NewContactClient } from "./NewContactClient";

export default function NewContactPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-6 py-6 text-sm text-slate-500">
          Loading new contact form…
        </div>
      }
    >
      <NewContactClient />
    </Suspense>
  );
}
