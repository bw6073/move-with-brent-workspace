// src/components/search/GlobalSearchBox.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

type ContactResult = { id: number; displayName: string; subtitle?: string };
type PropertyResult = { id: number; address: string; subtitle?: string };
type AppraisalResult = { id: number; title: string; subtitle?: string; status: string | null };
type TaskResult = { id: number; title: string; subtitle?: string; priority: string | null };
type DealResult = { id: number; title: string; subtitle?: string };

type SearchResults = {
  contacts: ContactResult[];
  properties: PropertyResult[];
  appraisals: AppraisalResult[];
  tasks: TaskResult[];
  deals: DealResult[];
};

type Section<T> = {
  key: string;
  label: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
};

export function GlobalSearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      setError(null);
      setLoading(false);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);

        if (!res.ok) {
          if (!cancelled) { setError("Search failed."); setResults(null); }
          return;
        }

        const json = (await res.json().catch(() => null)) as SearchResults;
        if (!cancelled) { setResults(json); setOpen(true); }
      } catch {
        if (!cancelled) { setError("Search failed."); setResults(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => { cancelled = true; clearTimeout(timeout); };
  }, [query]);

  const totalResults = results
    ? (results.contacts?.length ?? 0) +
      (results.properties?.length ?? 0) +
      (results.appraisals?.length ?? 0) +
      (results.tasks?.length ?? 0) +
      (results.deals?.length ?? 0)
    : 0;

  const badge = (label: string, cls = "bg-slate-100 text-slate-600") => (
    <span className={`ml-2 shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );

  const sections: Section<any>[] = [
    {
      key: "contacts",
      label: "Contacts",
      items: results?.contacts ?? [],
      renderItem: (c: ContactResult) => (
        <Link
          key={`c-${c.id}`}
          href={`/contacts/${c.id}`}
          className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50"
          onClick={() => { setOpen(false); setQuery(""); }}
        >
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-900">{c.displayName}</div>
            {c.subtitle && <div className="truncate text-[11px] text-slate-500">{c.subtitle}</div>}
          </div>
          {badge("Contact")}
        </Link>
      ),
    },
    {
      key: "properties",
      label: "Properties",
      items: results?.properties ?? [],
      renderItem: (p: PropertyResult) => (
        <Link
          key={`p-${p.id}`}
          href={`/properties/${p.id}`}
          className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50"
          onClick={() => { setOpen(false); setQuery(""); }}
        >
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-900">{p.address}</div>
            {p.subtitle && <div className="truncate text-[11px] text-slate-500">{p.subtitle}</div>}
          </div>
          {badge("Property")}
        </Link>
      ),
    },
    {
      key: "appraisals",
      label: "Appraisals",
      items: results?.appraisals ?? [],
      renderItem: (a: AppraisalResult) => (
        <Link
          key={`a-${a.id}`}
          href={`/appraisals/${a.id}/edit`}
          className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50"
          onClick={() => { setOpen(false); setQuery(""); }}
        >
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-900">{a.title}</div>
            {a.subtitle && <div className="truncate text-[11px] text-slate-500">{a.subtitle}</div>}
          </div>
          {badge(a.status ?? "Draft")}
        </Link>
      ),
    },
    {
      key: "tasks",
      label: "Tasks",
      items: results?.tasks ?? [],
      renderItem: (t: TaskResult) => (
        <Link
          key={`t-${t.id}`}
          href={`/tasks/${t.id}/edit`}
          className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50"
          onClick={() => { setOpen(false); setQuery(""); }}
        >
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-900">{t.title}</div>
            {t.subtitle && <div className="truncate text-[11px] text-slate-500">{t.subtitle}</div>}
          </div>
          {t.priority === "high" ? badge("High", "bg-red-100 text-red-700") : badge("Task")}
        </Link>
      ),
    },
    {
      key: "deals",
      label: "Pipeline",
      items: results?.deals ?? [],
      renderItem: (d: DealResult) => (
        <Link
          key={`d-${d.id}`}
          href={`/pipeline/${d.id}`}
          className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50"
          onClick={() => { setOpen(false); setQuery(""); }}
        >
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-900">{d.title}</div>
            {d.subtitle && <div className="truncate text-[11px] text-slate-500 capitalize">{d.subtitle}</div>}
          </div>
          {badge("Deal")}
        </Link>
      ),
    },
  ].filter((s) => s.items.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-sm focus-within:border-slate-500">
        <span className="mr-2 text-slate-400">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search everything…"
          className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
        />
        {loading && <span className="ml-1 text-[10px] text-slate-400">…</span>}
        {query && !loading && (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults(null); setOpen(false); }}
            className="ml-1 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute inset-x-0 z-20 mt-1 rounded-xl border border-slate-200 bg-white text-xs shadow-lg">
          <div className="max-h-96 overflow-auto p-2">
            {error && <p className="px-2 py-1 text-red-600">{error}</p>}

            {!error && !loading && totalResults === 0 && (
              <p className="px-2 py-1 text-slate-500">No results for "{query.trim()}".</p>
            )}

            {!error && sections.map((section) => (
              <div key={section.key} className="mb-2 last:mb-0">
                <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {section.label}
                </div>
                <ul>{section.items.map((item) => <li key={item.id}>{section.renderItem(item)}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
