"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Initial = {
  email: string;
  displayName: string;
  phone: string;
};

export function SettingsClient({ initial }: { initial: Initial }) {
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

  const clearNotices = () => {
    setMessage(null);
    setErrorMsg(null);
  };

  const safeText = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const normaliseEmail = (v: unknown) => safeText(v).toLowerCase();

  const refreshEverywhere = async () => {
    // Ensures JWT claims + server components pick up fresh auth metadata
    await supabase.auth.refreshSession().catch(() => {});
    router.refresh();
  };

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

      // Sync local state from returned user (source of truth)
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

      const { error } = await supabase.auth.updateUser({
        email: nextEmail,
      });

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
