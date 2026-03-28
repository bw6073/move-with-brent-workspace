// src/app/(app)/settings/SettingsClient.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Initial = {
  email: string;
  displayName: string;
  phone: string;
};

type GoogleCal = {
  id: string;
  summary: string;
  primary: boolean;
};

type EmailSettings = {
  resendApiKeySet: boolean;
  resendFromEmail: string;
  resendFromName: string;
};

type Props = {
  initial: Initial;
  googleConnected: boolean;
  initialOpenHomesCalendarId: string | null;
  initialAppraisalsCalendarId: string | null;
  initialEmailSettings: EmailSettings;
};

export function SettingsClient({
  initial,
  googleConnected,
  initialOpenHomesCalendarId,
  initialAppraisalsCalendarId,
  initialEmailSettings,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Calendar picker state
  const [calendars, setCalendars] = useState<GoogleCal[]>([]);
  const [loadingCals, setLoadingCals] = useState(false);
  const [savingCals, setSavingCals] = useState(false);

  const [openHomesCalId, setOpenHomesCalId] = useState<string>(
    initialOpenHomesCalendarId ?? "primary"
  );
  const [appraisalsCalId, setAppraisalsCalId] = useState<string>(
    initialAppraisalsCalendarId ?? "primary"
  );

  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);

  // Email (Resend) settings
  const [resendApiKey, setResendApiKey] = useState(
    initialEmailSettings.resendApiKeySet ? "••••••••" : ""
  );
  const [resendFromEmail, setResendFromEmail] = useState(initialEmailSettings.resendFromEmail);
  const [resendFromName, setResendFromName] = useState(initialEmailSettings.resendFromName);
  const [resendApiKeySet, setResendApiKeySet] = useState(initialEmailSettings.resendApiKeySet);
  const [savingEmail2, setSavingEmail2] = useState(false);

  const clearNotices = () => {
    setMessage(null);
    setErrorMsg(null);
  };

  const refreshEverywhere = async () => {
    await supabase.auth.refreshSession().catch(() => {});
    router.refresh();
  };

  const safeText = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const normaliseEmail = (v: unknown) => safeText(v).toLowerCase();

  // ───────────────── Google actions ─────────────────
  const disconnectGoogle = async () => {
    const ok = window.confirm(
      "Disconnect Google Calendar? Home opens will stop syncing until you reconnect."
    );
    if (!ok) return;

    clearNotices();
    setDisconnectingGoogle(true);

    try {
      const res = await fetch("/api/google/disconnect", { method: "POST" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Disconnect failed");
      }

      // local UI reset (optional)
      setCalendars([]);
      setOpenHomesCalId("primary");
      setAppraisalsCalId("primary");

      await refreshEverywhere();
      setMessage("Google Calendar disconnected.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to disconnect Google Calendar.");
    } finally {
      setDisconnectingGoogle(false);
    }
  };

  const loadCalendars = async () => {
    clearNotices();
    setLoadingCals(true);

    try {
      const res = await fetch("/api/google/calendars", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load calendars");
      }

      const list: GoogleCal[] = Array.isArray(json.calendars)
        ? json.calendars
        : [];

      setCalendars(list);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to load Google calendars.");
    } finally {
      setLoadingCals(false);
    }
  };

  const saveCalendarPrefs = async () => {
    clearNotices();
    setSavingCals(true);

    try {
      const res = await fetch("/api/google/calendar-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openHomesCalendarId: openHomesCalId,
          appraisalsCalendarId: appraisalsCalId,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Failed to save calendar preferences");
      }

      await refreshEverywhere();
      setMessage("Calendar preferences saved.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save calendar preferences.");
    } finally {
      setSavingCals(false);
    }
  };

  // ───────────────── Profile / email / password ─────────────────
  const saveProfile = async () => {
    clearNotices();
    setSavingProfile(true);

    try {
      const nextDisplayName = safeText(displayName);
      const nextPhone = safeText(phone);

      const { data, error } = await supabase.auth.updateUser({
        data: {
          display_name: nextDisplayName || null,
          phone: nextPhone || null,
        },
      });

      if (error) throw error;

      const meta = data.user?.user_metadata ?? {};
      setDisplayName((meta.display_name as string | undefined) ?? "");
      setPhone((meta.phone as string | undefined) ?? "");

      await refreshEverywhere();
      setMessage("Profile updated.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveEmail = async () => {
    clearNotices();
    setSavingEmail(true);

    try {
      const nextEmail = normaliseEmail(email);

      if (!nextEmail.includes("@")) {
        setErrorMsg("Please enter a valid email address.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ email: nextEmail });
      if (error) throw error;

      await refreshEverywhere();
      setMessage("Email update requested. Check your inbox to confirm.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update email.");
    } finally {
      setSavingEmail(false);
    }
  };

  const savePassword = async () => {
    clearNotices();
    setSavingPassword(true);

    try {
      if (!newPassword || newPassword.length < 8) {
        setErrorMsg("Password must be at least 8 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");

      await refreshEverywhere();
      setMessage("Password updated.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const saveEmailSettings = async () => {
    clearNotices();
    setSavingEmail2(true);
    try {
      const res = await fetch("/api/settings/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resend_api_key: resendApiKey,
          resend_from_email: resendFromEmail,
          resend_from_name: resendFromName,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to save email settings");
      // If a real key was entered, mask it and mark as set
      if (resendApiKey && !resendApiKey.startsWith("•")) {
        setResendApiKey("••••••••");
        setResendApiKeySet(true);
      }
      setMessage("Email settings saved.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save email settings.");
    } finally {
      setSavingEmail2(false);
    }
  };

  return (
    <div className="space-y-6">
      {(message || errorMsg) && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            errorMsg
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {errorMsg || message}
        </div>
      )}

      {/* Profile */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Profile</h2>
        <p className="mt-1 text-sm text-slate-500">
          This name is used in the app (e.g. “Signed in as …”).
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Display name
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Brent Falkingham"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Phone
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0407 564 677"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={saveProfile}
            disabled={savingProfile}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {savingProfile ? "Saving…" : "Save profile"}
          </button>
        </div>
      </section>

      {/* Email */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Email</h2>
        <p className="mt-1 text-sm text-slate-500">
          Updating your email may require confirmation via email.
        </p>

        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-700">
            Email address
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            autoComplete="email"
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={saveEmail}
            disabled={savingEmail}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            {savingEmail ? "Saving…" : "Update email"}
          </button>
        </div>
      </section>

      {/* Google Calendar */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Calendar</h2>
        <p className="mt-1 text-sm text-slate-500">
          Connect Google Calendar and choose where open homes and appraisals are
          saved.
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-700">
            Status:{" "}
            {googleConnected ? (
              <span className="font-medium text-emerald-700">Connected ✅</span>
            ) : (
              <span className="font-medium text-slate-700">Not connected</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/google/oauth/start"
              className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              {googleConnected ? "Reconnect" : "Connect Google Calendar"}
            </a>

            {googleConnected && (
              <button
                type="button"
                onClick={disconnectGoogle}
                disabled={disconnectingGoogle}
                className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
              >
                {disconnectingGoogle ? "Disconnecting…" : "Disconnect"}
              </button>
            )}
          </div>
        </div>

        {googleConnected && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-700">
                Pick calendars (optional). Defaults to your primary calendar.
              </div>
              <button
                type="button"
                onClick={loadCalendars}
                disabled={loadingCals}
                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
              >
                {loadingCals ? "Loading…" : "Load calendars"}
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Open homes calendar
                </label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  value={openHomesCalId}
                  onChange={(e) => setOpenHomesCalId(e.target.value)}
                >
                  <option value="primary">Primary calendar</option>
                  {calendars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.summary}
                      {c.primary ? " (Primary)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Appraisals calendar
                </label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  value={appraisalsCalId}
                  onChange={(e) => setAppraisalsCalId(e.target.value)}
                >
                  <option value="primary">Primary calendar</option>
                  {calendars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.summary}
                      {c.primary ? " (Primary)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={saveCalendarPrefs}
                disabled={savingCals}
                className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingCals ? "Saving…" : "Save calendar preferences"}
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Tip: Create calendars in Google like “Open homes” and
              “Appraisals”, then select them here.
            </p>
          </div>
        )}

        <p className="mt-3 text-xs text-slate-500">
          If you change Google accounts, use “Reconnect”.
        </p>
      </section>

      {/* Email integration */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Email integration</h2>
        <p className="mt-1 text-sm text-slate-500">
          Connect Resend to send emails from contact profiles. Get your API key at{" "}
          <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">
            resend.com
          </a>
          . The "from" address must be a verified domain in your Resend account.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Resend API key
            </label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              value={resendApiKey}
              onChange={(e) => setResendApiKey(e.target.value)}
              placeholder={resendApiKeySet ? "Enter a new key to replace the saved one" : "re_xxxxxxxxxxxxxxxx"}
              autoComplete="off"
            />
            {resendApiKeySet && (
              <p className="mt-1 text-xs text-slate-500">
                A key is saved. Paste a new one above to replace it.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              From email address
            </label>
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={resendFromEmail}
              onChange={(e) => setResendFromEmail(e.target.value)}
              placeholder="brent@yourdomain.com.au"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              From name
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={resendFromName}
              onChange={(e) => setResendFromName(e.target.value)}
              placeholder="Brent Falkingham"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={saveEmailSettings}
            disabled={savingEmail2}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {savingEmail2 ? "Saving…" : "Save email settings"}
          </button>
        </div>
      </section>

      {/* Password */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Password</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              New password
            </label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Confirm password
            </label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={savePassword}
            disabled={savingPassword}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {savingPassword ? "Saving…" : "Update password"}
          </button>
        </div>
      </section>
    </div>
  );
}
