// src/components/search/GlobalSearchBox.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

type ContactResult = {
  id: number;
  displayName: string;
  subtitle?: string;
};

type AppraisalResult = {
  id: number;
  title: string;
  subtitle?: string;
  status: string | null;
  created_at: string | null;
};

type SearchResults = {
  contacts: ContactResult[];
  appraisals: AppraisalResult[];
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
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`
        );

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("Global search failed:", txt);
          if (!cancelled) {
            setError("Search failed.");
            setResults(null);
          }
          return;
        }

        const json = (await res.json().catch(() => null)) as SearchResults;
        if (!cancelled) {
          console.log("🔎 Global search JSON:", json);
          setResults(json);
          setOpen(true);
        }
      } catch (err) {
        console.error("Global search error:", err);
        if (!cancelled) {
          setError("Search failed.");
          setResults(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  const hasResults =
    !!results &&
    ((results.contacts && results.contacts.length > 0) ||
      (results.appraisals && results.appraisals.length > 0));

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-sm focus-within:border-slate-500">
        <span className="mr-2 text-slate-400">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length >= 2) {
              setOpen(true);
            } else {
              setOpen(false);
            }
          }}
          placeholder="Search contacts & appraisals…"
          className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults(null);
              setOpen(false);
            }}
            className="ml-1 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute right-0 z-20 mt-1 w-[26rem] max-w-[90vw] rounded-xl border border-slate-200 bg-white text-xs shadow-lg">
          <div className="max-h-80 overflow-auto p-2">
            {loading && <p className="px-2 py-1 text-slate-500">Searching…</p>}

            {error && !loading && (
              <p className="px-2 py-1 text-red-600">{error}</p>
            )}

            {!loading && !error && !hasResults && (
              <p className="px-2 py-1 text-slate-500">
                No matches for “{query.trim()}”.
              </p>
            )}

            {!loading && !error && hasResults && (
              <>
                {/* Contacts */}
                {results?.contacts?.length ? (
                  <div className="mb-2">
                    <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Contacts
                    </div>
                    <ul className="space-y-0.5">
                      {results.contacts.map((c) => (
                        <li key={`c-${c.id}`}>
                          <Link
                            href={`/contacts/${c.id}`}
                            className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-50"
                            onClick={() => setOpen(false)}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-900">
                                {c.displayName}
                              </div>
                              {c.subtitle && (
                                <div className="truncate text-[11px] text-slate-500">
                                  {c.subtitle}
                                </div>
                              )}
                            </div>
                            <span className="ml-2 whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                              Contact
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Appraisals */}
                {results?.appraisals?.length ? (
                  <div>
                    <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Appraisals
                    </div>
                    <ul className="space-y-0.5">
                      {results.appraisals.map((a) => (
                        <li key={`a-${a.id}`}>
                          <Link
                            href={`/appraisals/${a.id}/edit`}
                            className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-50"
                            onClick={() => setOpen(false)}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-900">
                                {a.title}
                              </div>
                              {a.subtitle && (
                                <div className="truncate text-[11px] text-slate-500">
                                  {a.subtitle}
                                </div>
                              )}
                            </div>
                            <div className="ml-2 flex flex-col items-end gap-1">
                              {a.status && (
                                <span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                                  {a.status}
                                </span>
                              )}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
