// src/components/appraisal/AppraisalPhotoPrintGrid.tsx
"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Photo = {
  id: number;
  bucket: string;
  storage_path: string;
  caption: string | null;
  sort_order: number;
  is_primary: boolean;
  area_label: string | null;
};

type Props = {
  appraisalId: number;
};

export function AppraisalPhotoPrintGrid({ appraisalId }: Props) {
  const supabase = createClient();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/photos?entityType=appraisal&entityId=${appraisalId}`
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to load photos");
        }

        const list: Photo[] = (json.photos ?? []) as Photo[];

        if (!cancelled) {
          setPhotos(
            list.slice().sort((a, b) => {
              // Primary first, then sort_order
              if (a.is_primary && !b.is_primary) return -1;
              if (!a.is_primary && b.is_primary) return 1;
              return a.sort_order - b.sort_order;
            })
          );
        }
      } catch (err: any) {
        console.error(err);
        if (!cancelled) setError(err.message ?? "Error loading photos");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [appraisalId]);

  // 👉 Use the raw public URL (no transform) so the browser respects the true aspect ratio
  const getPrintUrl = (photo: Photo) => {
    const { data } = supabase.storage
      .from(photo.bucket)
      .getPublicUrl(photo.storage_path);
    return data.publicUrl;
  };

  if (loading && photos.length === 0) {
    return (
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 print:border-0 print:p-0">
        <h2 className="mb-3 text-base font-semibold text-slate-900 print:text-sm">
          Photos
        </h2>
        <p className="text-sm text-slate-500">Loading photos…</p>
      </section>
    );
  }

  if (error && photos.length === 0) {
    return (
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 print:border-0 print:p-0">
        <h2 className="mb-3 text-base font-semibold text-slate-900 print:text-sm">
          Photos
        </h2>
        <p className="text-sm text-red-600">{error}</p>
      </section>
    );
  }

  if (photos.length === 0) {
    return (
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 print:border-0 print:p-0">
        <h2 className="mb-3 text-base font-semibold text-slate-900 print:text-sm">
          Photos
        </h2>
        <p className="text-sm text-slate-500">
          No photos have been added to this appraisal yet.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-4 print:border-0 print:p-0">
      <h2 className="mb-3 text-base font-semibold text-slate-900 print:text-sm">
        Photos
      </h2>

      {/* 3-column grid for both screen + print */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 print:grid-cols-3 print:gap-2">
        {photos.map((photo) => (
          <figure
            key={photo.id}
            className="break-inside-avoid overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
          >
            <div className="w-full">
              <img
                src={getPrintUrl(photo)}
                alt={photo.caption ?? photo.area_label ?? "Photo"}
                // 👉 Let the image keep its natural ratio; cap the height so the grid looks neat
                className="mx-auto max-h-48 w-full object-contain bg-white print:max-h-40"
              />
            </div>
            {photo.area_label && (
              <figcaption className="px-2 py-1 text-[10px] text-slate-600 print:text-[9px]">
                {photo.area_label}
                {photo.is_primary && " · Primary"}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}
