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

// Size of each thumbnail square (px)
const THUMB_SIZE = 160;

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

  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

  // -------------------------------------------------------------------
  // Load photos for this entity
  // -------------------------------------------------------------------
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
  }, [entityType, entityId]);

  // -------------------------------------------------------------------
  // Area label helper
  // -------------------------------------------------------------------
  function currentAreaLabel() {
    if (selectedArea === "Other" && customArea.trim() !== "") {
      return customArea.trim();
    }
    return selectedArea;
  }

  // -------------------------------------------------------------------
  // Upload handler
  // -------------------------------------------------------------------
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

        // Upload file to supabase storage
        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(storagePath, file, {
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Insert DB reference
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

  // -------------------------------------------------------------------
  // Thumbnail URL — square crop for consistent grid
  // -------------------------------------------------------------------
  function getThumbUrl(photo: Photo) {
    const { data } = supabase.storage
      .from(photo.bucket)
      .getPublicUrl(photo.storage_path, {
        transform: {
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          resize: "cover", // this ensures no slits and no weird proportions
          quality: 80,
        },
      });

    return data.publicUrl;
  }

  // Full resolution for lightbox
  function getFullUrl(photo: Photo) {
    const { data } = supabase.storage
      .from(photo.bucket)
      .getPublicUrl(photo.storage_path);

    return data.publicUrl;
  }

  // -------------------------------------------------------------------
  // Set primary photo
  // -------------------------------------------------------------------
  async function setPrimary(photoId: number) {
    try {
      const res = await fetch("/api/photos/primary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, photoId }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      await loadPhotos();
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  }

  // -------------------------------------------------------------------
  // Delete photo
  // -------------------------------------------------------------------
  async function deletePhoto(photoId: number) {
    if (!window.confirm("Delete this photo?")) return;

    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error);

      if (lightboxPhoto?.id === photoId) setLightboxPhoto(null);

      await loadPhotos();
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  }

  const title =
    entityType === "appraisal" ? "Appraisal photos" : "Property photos";

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        {/* Header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>

          <div className="flex items-center gap-2">
            {/* Area selector */}
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs"
            >
              {PRESET_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            {/* Custom text field */}
            {selectedArea === "Other" && (
              <input
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
                placeholder="e.g. Workshop"
                className="h-8 rounded-lg border border-slate-300 px-2 text-xs"
              />
            )}

            {/* Upload button */}
            <label className="cursor-pointer rounded-xl border border-slate-300 bg-slate-50 px-3 py-1 text-xs hover:bg-slate-100">
              {uploading ? "Saving…" : "Take / add photos"}
              <input
                type="file"
                multiple
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>
        </div>

        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

        {/* Photo Grid */}
        {loading ? (
          <p className="text-sm text-slate-500">Loading photos…</p>
        ) : photos.length === 0 ? (
          <p className="text-sm text-slate-500">
            No photos yet. Use the button above to add some.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {photos
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((photo) => (
                <div
                  key={photo.id}
                  className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                >
                  {/* Thumbnail square */}
                  <button
                    className="block w-full"
                    onClick={() => setLightboxPhoto(photo)}
                  >
                    <div
                      style={{
                        width: THUMB_SIZE,
                        height: THUMB_SIZE,
                      }}
                      className="mx-auto flex items-center justify-center overflow-hidden rounded-xl bg-slate-200"
                    >
                      <img
                        src={getThumbUrl(photo)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </button>

                  {/* Label chip */}
                  <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
                    {photo.area_label}
                  </div>

                  {/* Controls */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between bg-black/40 px-2 py-1 text-[10px] text-white">
                    {photo.is_primary ? (
                      <span>Primary</span>
                    ) : (
                      <button
                        className="rounded bg-white/90 px-2 py-0.5 text-xs text-black"
                        onClick={() => setPrimary(photo.id)}
                      >
                        Set primary
                      </button>
                    )}

                    <button
                      className="rounded bg-red-500/90 px-2 py-0.5 text-xs"
                      onClick={() => deletePhoto(photo.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-h-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getFullUrl(lightboxPhoto)}
              className="max-h-[80vh] max-w-full rounded-xl object-contain"
              alt=""
            />
            <button
              className="absolute right-2 top-2 rounded bg-black/70 px-3 py-1 text-white"
              onClick={() => setLightboxPhoto(null)}
            >
              Close
            </button>

            {lightboxPhoto.area_label && (
              <div className="absolute left-2 bottom-2 rounded bg-black/70 px-3 py-1 text-white text-xs">
                {lightboxPhoto.area_label}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
