// src/app/(app)/contacts/import/page.tsx
import React from "react";
import { ContactImportClient } from "./ContactImportClient";

export default function ContactImportPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import contacts</h1>
        <p className="text-sm text-slate-500">
          Upload a CSV file to bulk-import contacts. Max 500 rows per import.
        </p>
      </div>
      <ContactImportClient />
    </div>
  );
}
