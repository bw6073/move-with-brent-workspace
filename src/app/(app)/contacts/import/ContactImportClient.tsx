"use client";
// src/app/(app)/contacts/import/ContactImportClient.tsx

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PreviewRow = Record<string, string>;

const EXPECTED_COLUMNS = [
  "first_name or name",
  "last_name",
  "email",
  "phone_mobile",
  "suburb",
  "stage",
  "rating",
];

export function ContactImportClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [csvText, setCsvText] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: PreviewRow[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      setResult(null);
      setError(null);

      // Quick parse for preview
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) { setError("CSV must have a header row and at least one data row."); return; }
      const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
      const rows = lines.slice(1, 6).map((line) => {
        const values = line.split(",").map((v) => v.replace(/"/g, "").trim());
        const row: PreviewRow = {};
        headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
        return row;
      });
      setPreview({ headers, rows });
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    if (!csvText || importing) return;
    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "Import failed.");
        return;
      }
      setResult({ imported: json.imported, skipped: json.skipped });
      setCsvText(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setError("Unexpected error during import.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Template hint */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <p className="font-medium text-slate-700 mb-1">Expected columns (flexible naming):</p>
        <p className="font-mono">{EXPECTED_COLUMNS.join(", ")}</p>
        <p className="mt-1 text-slate-500">
          Also supports: last_name, phone_home, phone_work, street_address, suburb, state, postcode,
          contact_type, lead_source, notes, is_buyer, is_seller
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center hover:border-slate-400 hover:bg-slate-50 transition-colors"
      >
        <p className="text-sm font-medium text-slate-700">Drop a CSV file here</p>
        <p className="text-xs text-slate-500 mt-1">or click to browse</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
        />
      </div>

      {/* Error */}
      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {/* Success */}
      {result && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          <p className="font-semibold">{result.imported} contacts imported successfully.</p>
          {result.skipped > 0 && <p className="text-xs mt-0.5">{result.skipped} rows skipped (missing name).</p>}
          <button
            type="button"
            onClick={() => router.push("/contacts")}
            className="mt-2 rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            View contacts
          </button>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Preview (first {preview.rows.length} rows)
            </p>
            <p className="text-xs text-slate-500">
              Detected {preview.headers.length} columns: {preview.headers.slice(0, 6).join(", ")}
              {preview.headers.length > 6 ? ` +${preview.headers.length - 6} more` : ""}
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {preview.headers.slice(0, 8).map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-slate-600 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    {preview.headers.slice(0, 8).map((h) => (
                      <td key={h} className="px-3 py-1.5 text-slate-700 whitespace-nowrap max-w-[140px] truncate">
                        {row[h] || <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {importing ? "Importing…" : "Import contacts"}
            </button>
            <button
              type="button"
              onClick={() => { setCsvText(null); setPreview(null); if (inputRef.current) inputRef.current.value = ""; }}
              className="rounded-full border border-slate-300 px-5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
