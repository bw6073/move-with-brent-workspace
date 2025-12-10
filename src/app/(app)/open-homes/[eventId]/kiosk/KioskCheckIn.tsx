// app/open-homes/[eventId]/kiosk/KioskCheckIn.tsx
"use client";

import React, { useEffect, useState } from "react";

type Props = {
  eventId: string;
  propertyId: number;
  propertyAddress: string;
};

type LeadSource =
  | "realestate_com_au"
  | "domain"
  | "reiwa"
  | "brookwood_site"
  | "social"
  | "signboard"
  | "referral"
  | "other";

type Role = "buyer" | "seller" | "both" | null;

// ───────────────────────────────────────────────────────────
// Offline queue helpers (localStorage)
// ───────────────────────────────────────────────────────────

const OFFLINE_QUEUE_KEY = "mwb-kiosk-offline-queue";

type OfflineQueuedAttendee = {
  id: string;
  eventId: string;
  payload: any;
  createdAt: string;
};

function readQueue(): OfflineQueuedAttendee[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineQueuedAttendee[];
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineQueuedAttendee[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

function addToQueue(eventId: string, payload: any) {
  const queue = readQueue();
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  queue.push({
    id,
    eventId,
    payload,
    createdAt: new Date().toISOString(),
  });
  writeQueue(queue);
}

function clearItemFromQueue(id: string) {
  const queue = readQueue().filter((item) => item.id !== id);
  writeQueue(queue);
}

export function KioskCheckIn({ eventId, propertyId, propertyAddress }: Props) {
  const [step, setStep] = useState<number>(1);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [role, setRole] = useState<Role>(null);

  const [leadSource, setLeadSource] = useState<LeadSource>("realestate_com_au");
  const [leadSourceOther, setLeadSourceOther] = useState("");

  const [researchVisit, setResearchVisit] = useState<"yes" | "no" | null>(null);
  const [mailingListOptIn, setMailingListOptIn] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);

  // ────────────────── VALIDATION PER STEP ──────────────────

  const validateStep = (stepNumber: number): boolean => {
    setErrorMessage(null);

    if (stepNumber === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        setErrorMessage("Please enter your first and last name.");
        return false;
      }
    }

    if (stepNumber === 2) {
      if (!phone.trim() && !email.trim()) {
        setErrorMessage("Please provide a mobile number or email address.");
        return false;
      }
    }

    if (stepNumber === 3) {
      if (!role) {
        setErrorMessage(
          "Please tell us whether you are a buyer, seller or both."
        );
        return false;
      }
    }

    if (stepNumber === 4) {
      if (leadSource === "other" && !leadSourceOther.trim()) {
        setErrorMessage("Please tell us where you saw this property.");
        return false;
      }
    }

    if (stepNumber === 5) {
      // Nothing extra for now – we could add consent checks later
      return true;
    }

    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, 5));
  };

  const goBack = () => {
    setErrorMessage(null);
    setStep((s) => Math.max(s - 1, 1));
  };

  const resetForm = () => {
    setStep(1);
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setRole(null);
    setLeadSource("realestate_com_au");
    setLeadSourceOther("");
    setResearchVisit(null);
    setMailingListOptIn(true);
    setErrorMessage(null);
  };

  // ────────────────── OFFLINE SYNC ──────────────────

  useEffect(() => {
    async function syncQueue() {
      // Only attempt sync if online
      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      const queue = readQueue().filter((item) => item.eventId === eventId);
      if (!queue.length) return;

      for (const item of queue) {
        try {
          const res = await fetch(`/api/open-homes/${item.eventId}/attendees`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.payload),
          });

          if (res.ok) {
            clearItemFromQueue(item.id);
          }
        } catch {
          // Keep it in the queue; it will retry next time we're online
        }
      }
    }

    // Run once on mount
    void syncQueue();

    // And whenever we come back online
    function handleOnline() {
      void syncQueue();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      return () => window.removeEventListener("online", handleOnline);
    }

    return;
  }, [eventId]);

  // ────────────────── SUBMIT ──────────────────

  const handleSubmit = async () => {
    if (!validateStep(5)) return;

    setSubmitting(true);
    setErrorMessage(null);

    const isBuyer = role === "buyer" || role === "both";
    const isSeller = role === "seller" || role === "both";

    const payload = {
      propertyId,
      firstName,
      lastName,
      phone,
      email,
      leadSource,
      leadSourceOther,
      isBuyer,
      isSeller,
      researchVisit: researchVisit === "yes",
      mailingListOptIn,
      notes: null,
    };

    const isOffline =
      typeof navigator !== "undefined" && navigator.onLine === false;

    try {
      if (isOffline) {
        // Offline: queue locally and behave like success
        addToQueue(eventId, payload);

        setShowThankYou(true);
        setTimeout(() => {
          setShowThankYou(false);
          resetForm();
        }, 2800);
        return;
      }

      // Online: normal POST
      const res = await fetch(`/api/open-homes/${eventId}/attendees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        console.error("Kiosk submit error:", json);
        setErrorMessage("Something went wrong. Please ask the agent for help.");
        return;
      }

      // Success: show thank you screen & reset
      setShowThankYou(true);
      setTimeout(() => {
        setShowThankYou(false);
        resetForm();
      }, 2800);
    } catch (err) {
      console.error("Kiosk submit error:", err);
      setErrorMessage(
        isOffline
          ? "Saved offline. This check-in will sync when back online."
          : "Network error. Please ask the agent for help."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ────────────────── SMALL UI HELPERS ──────────────────

  const StepLabel = ({ index, label }: { index: number; label: string }) => {
    const isActive = step === index;
    const isDone = step > index;

    return (
      <div className="flex items-center gap-2 text-xs">
        <div
          className={[
            "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold",
            isActive
              ? "border-blue-400 bg-blue-500 text-white"
              : isDone
              ? "border-emerald-400 bg-emerald-500 text-white"
              : "border-slate-600 bg-slate-900 text-slate-400",
          ].join(" ")}
        >
          {index}
        </div>
        <span
          className={
            isActive
              ? "text-slate-100"
              : isDone
              ? "text-slate-300"
              : "text-slate-500"
          }
        >
          {label}
        </span>
      </div>
    );
  };

  const chipBase =
    "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-medium transition-all";
  const chipActive =
    "bg-blue-500 text-white shadow-[0_0_18px_rgba(59,130,246,0.7)] scale-[1.02]";
  const chipInactive =
    "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-slate-50";

  const roleButton = (value: Role, label: string) => {
    const active = role === value;
    return (
      <button
        type="button"
        onClick={() => setRole(value)}
        className={`${chipBase} ${active ? chipActive : chipInactive}`}
      >
        {label}
      </button>
    );
  };

  const leadSourceButton = (value: LeadSource, label: string) => {
    const active = leadSource === value;
    return (
      <button
        type="button"
        onClick={() => setLeadSource(value)}
        className={`${chipBase} ${active ? chipActive : chipInactive}`}
      >
        {label}
      </button>
    );
  };

  const researchButton = (value: "yes" | "no", label: string) => {
    const active = researchVisit === value;
    return (
      <button
        type="button"
        onClick={() => setResearchVisit(value)}
        className={`${chipBase} ${active ? chipActive : chipInactive}`}
      >
        {label}
      </button>
    );
  };

  // ────────────────── STEP SCREENS ──────────────────

  const renderStep = () => {
    if (showThankYou) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-100">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.7)]">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="mb-2 text-2xl font-semibold">
            Thanks for checking in
          </h2>
          <p className="max-w-sm text-sm text-slate-300">
            The agent will be in touch if there&apos;s any update on this
            property or others that might suit you.
          </p>
        </div>
      );
    }

    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-blue-300/80">
                Step 1
              </p>
              <h2 className="mb-1 text-2xl font-semibold text-slate-50">
                Your details
              </h2>
              <p className="text-sm text-slate-300">
                Please enter your name to check in for this open home.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  First name
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Last name
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-blue-300/80">
                Step 2
              </p>
              <h2 className="mb-1 text-2xl font-semibold text-slate-50">
                Contact details
              </h2>
              <p className="text-sm text-slate-300">
                We&apos;ll only use this to follow up about this property and
                similar homes.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Mobile
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="04…"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Email (optional)
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-blue-300/80">
                Step 3
              </p>
              <h2 className="mb-1 text-2xl font-semibold text-slate-50">
                Are you here today as a…
              </h2>
              <p className="text-sm text-slate-300">
                This helps the agent understand how best to follow up with you.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {roleButton("buyer", "Buyer")}
                {roleButton("seller", "Seller")}
                {roleButton("both", "Buyer & Seller")}
              </div>

              <div className="space-y-2 border-t border-slate-800 pt-2">
                <label className="block text-xs font-medium text-slate-300">
                  Is this visit mainly for research?
                </label>
                <div className="flex flex-wrap gap-2">
                  {researchButton("yes", "Yes")}
                  {researchButton("no", "No")}
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-blue-300/80">
                Step 4
              </p>
              <h2 className="mb-1 text-2xl font-semibold text-slate-50">
                Where did you see this property?
              </h2>
              <p className="text-sm text-slate-300">
                Knowing where you found us helps improve our marketing.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {leadSourceButton("realestate_com_au", "realestate.com.au")}
                {leadSourceButton("domain", "Domain")}
                {leadSourceButton("reiwa", "REIWA")}
                {leadSourceButton("brookwood_site", "Brookwood site")}
                {leadSourceButton("social", "Social media")}
                {leadSourceButton("signboard", "Signboard")}
                {leadSourceButton("referral", "Referral")}
                {leadSourceButton("other", "Other")}
              </div>

              {leadSource === "other" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Please tell us where
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70"
                    value={leadSourceOther}
                    onChange={(e) => setLeadSourceOther(e.target.value)}
                    placeholder="e.g. Friend, office window, flyer, etc."
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 5:
      default:
        return (
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-blue-300/80">
                Step 5
              </p>
              <h2 className="mb-1 text-2xl font-semibold text-slate-50">
                Stay in the loop
              </h2>
              <p className="text-sm text-slate-300">
                We can keep you updated about this property and similar homes in
                the area.
              </p>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setMailingListOptIn((v) => !v)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
                  mailingListOptIn
                    ? "border-blue-500 bg-blue-500/10 text-slate-50"
                    : "border-slate-700 bg-slate-900 text-slate-200"
                }`}
              >
                <span>
                  Join the mailing list for updates on this and similar
                  properties
                </span>
                <span
                  className={`ml-3 inline-flex h-5 w-9 items-center rounded-full ${
                    mailingListOptIn ? "bg-blue-500" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded-full bg-white transition-transform ${
                      mailingListOptIn ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>

              <p className="text-[11px] text-slate-400">
                You can opt out of updates at any time. Your details are kept
                confidential and are not shared with third parties.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-2 w-full rounded-2xl bg-blue-500 px-4 py-3 text-base font-semibold text-white shadow-[0_0_30px_rgba(59,130,246,0.7)] hover:bg-blue-600 disabled:opacity-60"
            >
              {submitting ? "Checking you in…" : "Complete check-in"}
            </button>
          </div>
        );
    }
  };

  // ────────────────── MAIN LAYOUT ──────────────────

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        {/* Top bar – feels like an app header */}
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-blue-300/80">
              Open Home Check-In
            </p>
            <h1 className="text-lg font-semibold text-slate-50">
              {propertyAddress}
            </h1>
          </div>
          <div className="hidden text-right text-[11px] text-slate-500 sm:block">
            <p>Welcome, please check in</p>
          </div>
        </header>

        {/* Card */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute -inset-10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.13),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.08),_transparent_55%)]" />

          <div className="relative z-10 mx-auto flex h-full max-w-xl flex-col rounded-3xl border border-slate-800 bg-slate-950/70 px-5 py-6 shadow-[0_0_60px_rgba(15,23,42,0.9)] backdrop-blur-xl sm:px-7 sm:py-7">
            {/* Step indicators */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-3">
                <StepLabel index={1} label="Your details" />
                <StepLabel index={2} label="Contact" />
                <StepLabel index={3} label="Buyer / seller" />
                <StepLabel index={4} label="Where you saw it" />
                <StepLabel index={5} label="Mailing list" />
              </div>
              <div className="text-[11px] text-slate-500">Step {step} of 5</div>
            </div>

            <div className="flex-1">
              {renderStep()}
              {errorMessage && !showThankYou && (
                <p className="mt-4 text-xs font-medium text-red-400">
                  {errorMessage}
                </p>
              )}
            </div>

            {!showThankYou && (
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 1}
                  className="rounded-2xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-900 disabled:opacity-40"
                >
                  Back
                </button>
                {step < 5 && (
                  <button
                    type="button"
                    onClick={goNext}
                    className="rounded-2xl bg-blue-500 px-5 py-2.5 text-xs font-semibold text-white shadow-[0_0_20px_rgba(59,130,246,0.6)] hover:bg-blue-600"
                  >
                    Next
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <footer className="mt-4 text-center text-[10px] text-slate-500">
          By checking in, you consent to being contacted about this and related
          properties. You can opt out at any time.
        </footer>
      </div>
    </div>
  );
}
