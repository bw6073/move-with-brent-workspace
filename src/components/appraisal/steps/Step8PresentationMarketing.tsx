"use client";

import React, { useMemo, useRef, useState } from "react";
import type { FormState } from "../config/types";
import { MARKETING_CHANNELS } from "../config/constants";

type Step8PresentationMarketingProps = {
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  toggleArrayValue: (key: keyof FormState, value: string) => void;

  // from parent (AppraisalForm) so this card can sync
  appraisalId: number;
  googleConnected: boolean;

  // ✅ ensure followUpAt is persisted before syncing
  onSaveDraft: () => Promise<void>;
};

function toDateTimeLocal(v: unknown) {
  const iso = typeof v === "string" ? v : "";
  if (!iso) return "";

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromDateTimeLocal(v: string) {
  // v = "YYYY-MM-DDTHH:mm"
  if (!v) return null;

  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;

  const [, yy, mm, dd, hh, mi] = m;
  const d = new Date(
    Number(yy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(mi),
    0,
    0
  );

  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function Step8PresentationMarketing({
  form,
  updateField,
  toggleArrayValue,
  appraisalId,
  googleConnected,
  onSaveDraft,
}: Step8PresentationMarketingProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearMsgSoon = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setSyncMsg(null), 3500);
  };

  // Back-compat: if old followUpDate exists but followUpAt isn't set, use 09:00 local.
  const followUpAtIso = useMemo(() => {
    const anyForm = form as any;

    const followUpAt = anyForm.followUpAt as string | null | undefined;
    if (followUpAt) return followUpAt;

    const followUpDate = anyForm.followUpDate as string | null | undefined;
    if (!followUpDate) return null;

    const d = new Date(`${followUpDate}T09:00:00`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }, [form]);

  const handleSync = async () => {
    if (!googleConnected || syncing) return;

    setSyncing(true);
    setSyncMsg(null);

    try {
      // ✅ save first so followUpAt is in the DB for the server-side sync route
      await onSaveDraft();

      const res = await fetch(`/api/appraisals/${appraisalId}/sync-calendar`, {
        method: "POST",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Sync failed");

      setSyncMsg("Synced to Google ✅");
      clearMsgSoon();
    } catch (e: any) {
      setSyncMsg(e?.message || "Failed to sync.");
      clearMsgSoon();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* PRESENTATION OVERVIEW */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Presentation, marketing &amp; follow-up
        </h2>
        <p className="text-sm text-slate-500">
          How the home presents, who you&apos;ll target and what happens next.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Presentation score (1–10)
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={form.presentationScore}
              onChange={(e) =>
                updateField("presentationScore", e.target.value as any)
              }
              className="mt-1 w-full"
            />
            <div className="mt-1 text-xs text-slate-600">
              Current score: {form.presentationScore}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              One-line presentation summary
            </label>
            <input
              type="text"
              value={form.presentationSummary}
              onChange={(e) =>
                updateField("presentationSummary", e.target.value as any)
              }
              placeholder="Neat but dated – great bones, needs cosmetic refresh."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      {/* MARKETING IDEAS */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Marketing ideas
        </h3>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Target buyer profile
          </label>
          <textarea
            value={form.targetBuyerProfile}
            onChange={(e) =>
              updateField("targetBuyerProfile", e.target.value as any)
            }
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Headline / angle ideas
          </label>
          <textarea
            value={form.headlineIdeas}
            onChange={(e) =>
              updateField("headlineIdeas", e.target.value as any)
            }
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Marketing channels
          </label>
          <div className="mt-1 grid gap-2 sm:grid-cols-3">
            {MARKETING_CHANNELS.map((channel) => (
              <label
                key={channel}
                className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={(form.marketingChannels ?? []).includes(channel)}
                  onChange={() =>
                    toggleArrayValue("marketingChannels", channel)
                  }
                />
                <span>{channel}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* FOLLOW-UP + GOOGLE SYNC */}
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Follow-up</h3>
            <p className="mt-1 text-xs text-slate-500">
              Set a follow-up time and sync it to Google (uses the follow-up
              time).
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-xs text-slate-600">
              Google:{" "}
              {googleConnected ? (
                <span className="font-medium text-emerald-700">
                  Connected ✅
                </span>
              ) : (
                <span className="font-medium text-slate-700">
                  Not connected
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSync}
              disabled={!googleConnected || syncing}
              className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {syncing ? "Syncing…" : "Sync to Google"}
            </button>

            {syncMsg && <div className="text-xs text-slate-600">{syncMsg}</div>}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Next steps &amp; reminders
            </label>
            <textarea
              value={form.followUpActions}
              onChange={(e) =>
                updateField("followUpActions", e.target.value as any)
              }
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Follow-up date &amp; time
            </label>
            <input
              type="datetime-local"
              value={toDateTimeLocal(followUpAtIso)}
              onChange={(e) =>
                updateField(
                  "followUpAt" as any,
                  fromDateTimeLocal(e.target.value) as any
                )
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              This drives reminders and the Google Calendar event time.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
