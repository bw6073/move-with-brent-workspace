// src/components/photos/PhotoManager.tsx
"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

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

const THUMB_WIDTH = 300;

export function PhotoManager({ entityType, entityId }: Props) {
  const supabase = createClient();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedArea, setSelectedArea] = useState("General");
  const [customArea, setCustomArea] = useState("");

  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

  async function loadPhotos() {
    try {
      setLoading(true);
      setError(null);

      // If we don't have an entityId yet (new/unsaved), don't hit the API
      if (!entityId) {
        setPhotos([]);
        return;
      }

      const params = new URLSearchParams({
        entityType,
        entityId: String(entityId),
      });

      const res = await fetch(`/api/photos?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        console.error("Failed to load photos", res.status, json);
        setError(json.error || "Failed to load photos");
        return;
      }

      const list: Photo[] = json.photos ?? [];
      setPhotos(list);
    } catch (err: any) {
      console.error("Unexpected error loading photos", err);
      setError(err.message || "Failed to load photos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPhotos();
  }, [entityType, entityId]);

  const areaLabel = () => {
    if (selectedArea === "Other" && customArea.trim() !== "") {
      return customArea.trim();
    }
    return selectedArea;
  };

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

      if (!user || userError) throw new Error("Not logged in");

      const existing = photos.length;
      const label = areaLabel();

      for (const [index, file] of Array.from(files).entries()) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const storagePath = `${
          user.id
        }/${entityType}/${entityId}/${Date.now()}-${safeName}`;
        const sortOrder = existing + index;

        const { error: uploadErr } = await supabase.storage
          .from("photos")
          .upload(storagePath, file, { cacheControl: "3600", upsert: false });

        if (uploadErr) throw uploadErr;

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
            areaLabel: label,
          }),
        });

        if (!res.ok) throw new Error("Failed to save photo");
      }

      await loadPhotos();
      e.target.value = "";
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Upload error");
    } finally {
      setUploading(false);
    }
  }

  // -------- DRAG + DROP (updated logging) --------
  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;

    const updated = Array.from(photos);
    const [moved] = updated.splice(result.source.index, 1);
    updated.splice(result.destination.index, 0, moved);

    setPhotos(updated);

    try {
      const res = await fetch("/api/photos/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          photoIdsInOrder: updated.map((p) => p.id),
        }),
      });

      if (!res.ok) {
        let message = "Failed to save photo order";
        try {
          const body = await res.json();
          if (body?.error) message = body.error;
        } catch {
          // ignore JSON parse issues, keep default message
        }
        console.error("Reorder error", res.status, message);
        setError(message);
      }
    } catch (err) {
      console.error(err);
      setError("Error saving photo order");
    }
  }

  async function deletePhoto(photoId: number) {
    const res = await fetch(`/api/photos/${photoId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      console.error(await res.text());
      setError("Failed to delete photo");
      return;
    }

    if (lightboxPhoto?.id === photoId) setLightboxPhoto(null);

    await loadPhotos();
  }

  async function setPrimary(photoId: number) {
    const res = await fetch(`/api/photos/primary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType, entityId, photoId }),
    });

    if (!res.ok) {
      console.error(await res.text());
      setError("Failed to update primary photo");
      return;
    }

    await loadPhotos();
  }

  const getThumbUrl = (p: Photo) =>
    supabase.storage.from(p.bucket).getPublicUrl(p.storage_path, {
      transform: {
        width: THUMB_WIDTH,
        height: Math.round((THUMB_WIDTH * 3) / 4),
        resize: "contain",
        quality: 80,
      },
    }).data.publicUrl;

  const getFullUrl = (p: Photo) =>
    supabase.storage.from(p.bucket).getPublicUrl(p.storage_path).data.publicUrl;

  const title =
    entityType === "appraisal" ? "Appraisal photos" : "Property photos";

  return (
    <>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        {/* Header row */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600">Area</label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800"
              >
                {PRESET_AREAS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
              {selectedArea === "Other" && (
                <input
                  type="text"
                  value={customArea}
                  onChange={(e) => setCustomArea(e.target.value)}
                  placeholder="Custom area"
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800"
                />
              )}
            </div>

            <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-800 hover:bg-slate-100">
              <span>{uploading ? "Saving…" : "Add / take photos"}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

        {loading && photos.length === 0 && (
          <p className="text-sm text-slate-500">Loading photos…</p>
        )}

        {!loading && photos.length === 0 && (
          <p className="text-sm text-slate-500">
            No photos yet. Choose an area and tap &ldquo;Add / take
            photos&rdquo;.
          </p>
        )}

        {photos.length > 0 && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="photo-grid" direction="horizontal">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"
                >
                  {photos.map((photo, index) => (
                    <Draggable
                      key={photo.id}
                      draggableId={String(photo.id)}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={provided.draggableProps.style}
                          className="group relative cursor-grab rounded-2xl border border-slate-200 bg-slate-50 p-2 active:cursor-grabbing"
                        >
                          <button
                            type="button"
                            className="block w-full"
                            onClick={() => setLightboxPhoto(photo)}
                          >
                            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-200">
                              <img
                                src={getThumbUrl(photo)}
                                alt={
                                  photo.caption ?? photo.area_label ?? "Photo"
                                }
                                draggable={false}
                                className="absolute inset-0 h-full w-full object-contain bg-slate-200"
                              />
                            </div>
                          </button>

                          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                            {photo.area_label ?? "General"}
                          </span>

                          <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                            <div className="text-xs text-slate-600">
                              {photo.is_primary ? "Primary photo" : "\u00A0"}
                            </div>
                            <div className="flex gap-1">
                              {!photo.is_primary && (
                                <button
                                  type="button"
                                  onClick={() => setPrimary(photo.id)}
                                  className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-slate-700"
                                >
                                  Set primary
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => deletePhoto(photo.id)}
                                className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getFullUrl(lightboxPhoto)}
              alt={lightboxPhoto.caption ?? lightboxPhoto.area_label ?? "Photo"}
              className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain"
            />
            <button
              type="button"
              className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white"
              onClick={() => setLightboxPhoto(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
