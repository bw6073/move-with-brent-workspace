// src/components/attachments/AttachmentManager.tsx
"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  entityType: "contact" | "appraisal" | "property" | "task";
  entityId: number;
};

type Attachment = {
  id: number;
  bucket: string;
  storage_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  is_image: boolean;
  created_at: string;
};

export function AttachmentManager({ entityType, entityId }: Props) {
  const supabase = createClient();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAttachments() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/attachments?entityType=${entityType}&entityId=${entityId}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load attachments");
      setAttachments(json.attachments ?? []);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Error loading attachments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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
        throw new Error("You must be logged in to upload files");
      }

      for (const file of Array.from(files)) {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const storagePath = `${user.id}/${entityType}/${entityId}/${timestamp}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const res = await fetch("/api/attachments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType,
            entityId,
            bucket: "attachments",
            storagePath,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            isImage: file.type.startsWith("image/"),
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to save attachment");
      }

      await loadAttachments();
      e.target.value = "";
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Error uploading file");
    } finally {
      setUploading(false);
    }
  }

  function getPublicUrl(att: Attachment) {
    // for private buckets, you might swap this to use signed URLs via an API route
    const { data } = supabase.storage
      .from(att.bucket)
      .getPublicUrl(att.storage_path);
    return data.publicUrl;
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">Attachments</h3>
        <label className="inline-flex cursor-pointer items-center text-xs font-medium text-blue-700 hover:underline">
          <span>{uploading ? "Uploading…" : "Add files"}</span>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading attachments…</p>
      ) : attachments.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No attachments yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {attachments.map((att) => {
            const url = getPublicUrl(att);
            return (
              <li
                key={att.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  {att.is_image && (
                    // tiny preview (this will be refined in the next section for proper photos)
                    <img
                      src={url}
                      alt={att.file_name}
                      className="h-10 w-10 rounded-md object-cover"
                    />
                  )}
                  <div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {att.file_name}
                    </a>
                    <p className="text-xs text-slate-500">
                      {att.file_type || "Unknown type"}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
