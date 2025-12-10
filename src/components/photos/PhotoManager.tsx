// src/components/photos/PhotoManager.tsx
"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type EntityType = "property" | "appraisal";

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
  entityType: EntityType;
  entityId: number;
};

const PRESET_AREAS = [
  "General",
  "Front",
  "Street / Driveway",
  "Entry",
  "Lounge",
  "Family",
  "Dining",
  "Kitchen",
  "Meals",
  "Main Bedroom",
  "Ensuite",
  "Bedroom 2",
  "Bedroom 3",
  "Bedroom 4",
  "Bathroom",
  "Laundry",
  "Study",
  "Activity",
  "Theatre",
  "Alfresco",
  "Patio",
  "Backyard",
  "Pool",
  "Shed",
  "View",
  "Aerial",
  "Other",
];

export function PhotoManager({ entityType, entityId }: Props) {
  const supabase = createClient();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedArea, setSelectedArea] = useState<string>("General");
  const [customArea, setCustomArea] = useState<string>("");

  async function loadPhotos() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/photos?entityType=${entityType}&entityId=${entityId}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load photos");
      setPhotos(json.photos ?? []);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Error loading photos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  function currentAreaLabel() {
    if (selectedArea === "Other" && customArea.trim().length > 0) {
      return customArea.trim();
    }
    if (selectedArea === "Other") return "Other";
    return selectedArea || "General";
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in");
      }

      const existingCount = photos.length;
      const areaLabel = currentAreaLabel();

      for (const [index, file] of Array.from(files).entries()) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const timestamp = Date.now();
        const sortOrder = existingCount + index;

        const storagePath = `${user.id}/${entityType}/${entityId}/${sortOrder}-${timestamp}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const res = await fetch("/api/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType,
            entityId,
            bucket: "photos",
            storagePath,
            sortOrder,
            caption: null,
            areaLabel,
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to save photo");
      }

      await loadPhotos();
      e.target.value = "";
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Error uploading photos");
    } finally {
      setUploading(false);
    }
  }

  function getThumbUrl(photo: Photo, width = 400) {
    const { data } = supabase.storage
      .from(photo.bucket)
      .getPublicUrl(photo.storage_path, {
        transform: { width, quality: 80 },
      });

    return data.publicUrl;
  }

  async function setPrimary(photoId: number) {
    try {
      const res = await fetch("/api/photos/primary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, photoId }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to update primary photo");
      await loadPhotos();
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Error updating primary photo");
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
      {/* Header / controls */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-800">
          Appraisal photos
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          {/* Room / area selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600">Area</label>
            <select
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
            >
              {PRESET_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
            {selectedArea === "Other" && (
              <input
                type="text"
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
                placeholder="e.g. Workshop, Studio"
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800"
              />
            )}
          </div>

          {/* Capture/upload button */}
          <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-800 hover:bg-slate-100">
            <span>{uploading ? "Saving…" : "Take / add photos"}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              // On iPad / iPhone this will open the camera first
              capture="environment"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading photos…</p>
      ) : photos.length === 0 ? (
        <p className="text-sm text-slate-500">
          No photos yet. Choose an area and tap &ldquo;Take / add photos&rdquo;
          to start capturing as you walk through the property.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {photos
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((photo) => (
              <div
                key={photo.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-100"
              >
                <img
                  src={getThumbUrl(photo)}
                  alt={photo.caption ?? photo.area_label ?? "Photo"}
                  className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
                />

                {/* Top-left chip: area / room */}
                <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                  {photo.area_label ?? "General"}
                </div>

                {/* Bottom bar: primary toggle */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/40 px-2 py-1 text-xs text-white">
                  <span>{photo.is_primary ? "Primary" : "\u00A0"}</span>
                  {!photo.is_primary && (
                    <button
                      type="button"
                      className="rounded bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-800 hover:bg-white"
                      onClick={() => void setPrimary(photo.id)}
                    >
                      Set as primary
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
