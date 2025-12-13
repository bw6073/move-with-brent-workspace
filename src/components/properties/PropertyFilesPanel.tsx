"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PhotoRow = {
  id: number;
  bucket: string;
  storage_path: string;
  caption: string | null;
  sort_order: number;
  is_primary: boolean;
  area_label: string | null;
  created_at: string;
};

type AttachmentRow = {
  id: number;
  bucket: string;
  storage_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  is_image: boolean;
  description: string | null;
  created_at: string;
};

type Props = {
  propertyId: number;
};

const ENTITY_TYPE = "property" as const;
const PHOTO_BUCKET = "photos";
const ATTACHMENT_BUCKET = "attachments";

function niceBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n = n / 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function safeFileName(name: string) {
  return name.replace(/[^\w.\-() ]+/g, "_");
}

export function PropertyFilesPanel({ propertyId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const attachInputRef = useRef<HTMLInputElement | null>(null);

  const [photoArea, setPhotoArea] = useState<string>("General");

  // ✅ Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxLoading, setLightboxLoading] = useState(false);

  const entityQuery = `entityType=${ENTITY_TYPE}&entityId=${propertyId}`;

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const [pRes, aRes] = await Promise.all([
        fetch(`/api/photos?${entityQuery}`),
        fetch(`/api/attachments?${entityQuery}`),
      ]);

      if (!pRes.ok) throw new Error("Failed to load photos");
      if (!aRes.ok) throw new Error("Failed to load attachments");

      const pJson = (await pRes.json()) as { photos: PhotoRow[] };
      const aJson = (await aRes.json()) as { attachments: AttachmentRow[] };

      setPhotos(pJson.photos ?? []);
      setAttachments(aJson.attachments ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  async function openStorageFile(bucket: string, path: string) {
    // Public URL if bucket is public
    const publicUrl = supabase.storage.from(bucket).getPublicUrl(path)
      .data.publicUrl;

    if (publicUrl) {
      window.open(publicUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // Signed URL if bucket is private
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message || "Unable to open file");
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  // ✅ Used by lightbox (public if possible, otherwise signed)
  async function getViewUrl(bucket: string, path: string) {
    const publicUrl = supabase.storage.from(bucket).getPublicUrl(path)
      .data.publicUrl;
    if (publicUrl) return publicUrl;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message || "Unable to load image");
    }

    return data.signedUrl;
  }

  function openLightboxAt(index: number) {
    if (index < 0 || index >= photos.length) return;
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
    setLightboxUrl(null);
  }

  function gotoLightbox(delta: -1 | 1) {
    if (!photos.length) return;
    const next = (lightboxIndex + delta + photos.length) % photos.length;
    setLightboxIndex(next);
  }

  // Load the lightbox image whenever opened / index changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!lightboxOpen) return;
      const p = photos[lightboxIndex];
      if (!p) return;

      setLightboxLoading(true);
      try {
        const url = await getViewUrl(p.bucket, p.storage_path);
        if (!cancelled) setLightboxUrl(url);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Unable to load image");
      } finally {
        if (!cancelled) setLightboxLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, lightboxIndex, photos]);

  // Keyboard controls
  useEffect(() => {
    if (!lightboxOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") gotoLightbox(-1);
      if (e.key === "ArrowRight") gotoLightbox(1);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, lightboxIndex, photos.length]);

  async function handleUploadPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;

    setBusy("Uploading photos…");
    setError(null);

    try {
      const startOrder = photos.length;
      const fileArr = Array.from(files);

      for (let i = 0; i < fileArr.length; i++) {
        const file = fileArr[i];
        const name = safeFileName(file.name);
        const path = `${ENTITY_TYPE}/${propertyId}/photos/${Date.now()}-${i}-${name}`;

        const { error: upErr } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(path, file, {
            upsert: false,
            contentType: file.type || undefined,
          });

        if (upErr) throw new Error(upErr.message);

        const res = await fetch("/api/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: ENTITY_TYPE,
            entityId: propertyId,
            bucket: PHOTO_BUCKET,
            storagePath: path,
            sortOrder: startOrder + i,
            caption: null,
            areaLabel: photoArea,
          }),
        });

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Failed to save photo");
        }
      }

      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setBusy(null);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  async function handleUploadAttachments(files: FileList | null) {
    if (!files || files.length === 0) return;

    setBusy("Uploading files…");
    setError(null);

    try {
      const fileArr = Array.from(files);

      for (let i = 0; i < fileArr.length; i++) {
        const file = fileArr[i];
        const name = safeFileName(file.name);
        const path = `${ENTITY_TYPE}/${propertyId}/attachments/${Date.now()}-${i}-${name}`;

        const { error: upErr } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .upload(path, file, {
            upsert: false,
            contentType: file.type || undefined,
          });

        if (upErr) throw new Error(upErr.message);

        const res = await fetch("/api/attachments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: ENTITY_TYPE,
            entityId: propertyId,
            bucket: ATTACHMENT_BUCKET,
            storagePath: path,
            fileName: file.name,
            fileType: file.type || null,
            fileSize: file.size ?? null,
            isImage: file.type?.startsWith("image/") ?? false,
            description: null,
          }),
        });

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Failed to save attachment");
        }
      }

      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setBusy(null);
      if (attachInputRef.current) attachInputRef.current.value = "";
    }
  }

  async function setPrimary(photoId: number) {
    setBusy("Setting primary…");
    setError(null);

    try {
      const res = await fetch("/api/photos/primary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: photoId,
          entityType: ENTITY_TYPE,
          entityId: propertyId,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to set primary");
      }

      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to set primary");
    } finally {
      setBusy(null);
    }
  }

  async function movePhoto(photoId: number, dir: -1 | 1) {
    const idx = photos.findIndex((p) => p.id === photoId);
    if (idx < 0) return;

    const next = [...photos];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= next.length) return;

    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];

    setBusy("Reordering…");
    setError(null);

    try {
      const orderedIds = next.map((p) => p.id);
      const res = await fetch("/api/photos/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: ENTITY_TYPE,
          entityId: propertyId,
          orderedIds,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to reorder photos");
      }

      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Reorder failed");
    } finally {
      setBusy(null);
    }
  }

  async function deletePhoto(photoId: number) {
    if (!confirm("Delete this photo?")) return;

    setBusy("Deleting photo…");
    setError(null);

    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to delete photo");
      }
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete photo");
    } finally {
      setBusy(null);
    }
  }

  async function deleteAttachment(attachmentId: number) {
    if (!confirm("Delete this file?")) return;

    setBusy("Deleting file…");
    setError(null);

    try {
      const res = await fetch(`/api/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to delete attachment");
      }
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete file");
    } finally {
      setBusy(null);
    }
  }

  // Thumbnails: public url (if private, thumbnail may not render — still OK)
  function photoThumbUrl(p: PhotoRow) {
    return supabase.storage.from(p.bucket).getPublicUrl(p.storage_path).data
      .publicUrl;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Files</div>
          <div className="mt-0.5 text-xs text-slate-500">
            Photos + documents stored against this property.
          </div>
        </div>

        <button
          type="button"
          onClick={refresh}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {busy && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          {busy}
        </div>
      )}

      {/* PHOTOS */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-slate-900">Photos</div>

          <div className="flex items-center gap-2">
            <select
              value={photoArea}
              onChange={(e) => setPhotoArea(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
              title="Area label"
            >
              {[
                "General",
                "Exterior",
                "Interior",
                "Kitchen",
                "Bathrooms",
                "Bedrooms",
                "Workshop",
                "Views",
                "Aerial",
              ].map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>

            <label className="cursor-pointer rounded-lg bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800">
              Upload
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUploadPhotos(e.target.files)}
              />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="mt-3 text-xs text-slate-500">Loading…</div>
        ) : photos.length === 0 ? (
          <div className="mt-3 text-xs text-slate-500">No photos yet.</div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {photos.map((p, idx) => (
              <div
                key={p.id}
                className="rounded-lg border border-slate-200 overflow-hidden"
              >
                {/* ✅ click thumbnail opens lightbox */}
                <button
                  type="button"
                  onClick={() => openLightboxAt(idx)}
                  className="block w-full"
                  title="Open photo"
                >
                  <div className="aspect-video bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoThumbUrl(p)}
                      alt={p.caption ?? "Photo"}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                  </div>
                </button>

                <div className="p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-medium text-slate-800 truncate">
                      {p.area_label ?? "General"}
                      {p.is_primary ? (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
                          Primary
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => movePhoto(p.id, -1)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => movePhoto(p.id, 1)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                      title="Move down"
                    >
                      ↓
                    </button>

                    {!p.is_primary && (
                      <button
                        type="button"
                        onClick={() => setPrimary(p.id)}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                      >
                        Set primary
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openStorageFile(p.bucket, p.storage_path)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                    >
                      Open
                    </button>

                    <button
                      type="button"
                      onClick={() => deletePhoto(p.id)}
                      className="rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ATTACHMENTS */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-slate-900">
            Attachments
          </div>

          <label className="cursor-pointer rounded-lg bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800">
            Upload
            <input
              ref={attachInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleUploadAttachments(e.target.files)}
            />
          </label>
        </div>

        {loading ? (
          <div className="mt-3 text-xs text-slate-500">Loading…</div>
        ) : attachments.length === 0 ? (
          <div className="mt-3 text-xs text-slate-500">No attachments yet.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {attachments.map((a) => (
              <div
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-slate-800">
                    {a.file_name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {a.file_type ?? "File"}
                    {a.file_size ? ` • ${niceBytes(a.file_size)}` : ""}
                    {a.description ? ` • ${a.description}` : ""}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openStorageFile(a.bucket, a.storage_path)}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                  >
                    Open
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteAttachment(a.id)}
                    className="rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-[11px] text-slate-500">
        Tip: later we can add folders (floorplans, strata, brochure, photos by
        room), plus drag & drop sorting.
      </div>

      {/* ✅ LIGHTBOX OVERLAY */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeLightbox();
          }}
        >
          <div className="w-full max-w-5xl">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs text-white/80">
                {(photos[lightboxIndex]?.area_label ?? "General") +
                  " • " +
                  (lightboxIndex + 1) +
                  " / " +
                  photos.length}
              </div>

              <button
                type="button"
                onClick={closeLightbox}
                className="rounded-md bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
              >
                Close
              </button>
            </div>

            <div className="relative rounded-xl border border-white/10 bg-black">
              {/* IMAGE AREA */}
              <div className="relative overflow-hidden">
                <div className="flex items-center justify-center">
                  {lightboxLoading ? (
                    <div className="p-10 text-xs text-white/70">Loading…</div>
                  ) : lightboxUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={lightboxUrl}
                      alt={photos[lightboxIndex]?.caption ?? "Photo"}
                      className="max-h-[75vh] w-auto max-w-full object-contain"
                    />
                  ) : (
                    <div className="p-10 text-xs text-white/70">
                      Unable to load image
                    </div>
                  )}
                </div>

                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => gotoLightbox(-1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
                      title="Previous"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => gotoLightbox(1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
                      title="Next"
                    >
                      →
                    </button>
                  </>
                )}
              </div>

              {/* ACTIONS FOOTER */}
              <div className="border-t border-white/10 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  {!photos[lightboxIndex]?.is_primary && (
                    <button
                      type="button"
                      onClick={async () => {
                        const p = photos[lightboxIndex];
                        if (!p) return;
                        await setPrimary(p.id);
                      }}
                      className="rounded-md bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
                    >
                      Set primary
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      const p = photos[lightboxIndex];
                      if (!p) return;

                      const nextLen = photos.length - 1; // ✅ compute using current list
                      await deletePhoto(p.id);

                      if (nextLen <= 0) {
                        closeLightbox();
                      } else {
                        setLightboxIndex((i) => Math.min(i, nextLen - 1));
                      }
                    }}
                    className="rounded-md bg-red-500/20 px-3 py-1 text-xs text-white hover:bg-red-500/30"
                  >
                    Delete
                  </button>

                  <div className="ml-auto text-[11px] text-white/60">
                    {photos[lightboxIndex]?.area_label ?? "General"}
                    {photos[lightboxIndex]?.is_primary ? " • Primary" : ""}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-white/60">
              Tip: use ← / → to navigate, Esc to close.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
