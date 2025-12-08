// src/components/appraisal/AppraisalForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

import {
  Step,
  FormState,
  EMPTY_FORM,
  Room,
  ExteriorArea,
  NonPriceGoals,
  MinimalContact,
} from "./config/types";

import Step1Overview from "./steps/Step1Overview";
import Step2PropertyBasics from "./steps/Step2PropertyBasics";
import Step3Rooms from "./steps/Step3Rooms";
import Step4Exterior from "./steps/Step4Exterior";
import Step5OwnerOccupancy from "./steps/Step5OwnerOccupancy";
import Step6Motivation from "./steps/Step6Motivation";
import Step7PricingStrategy from "./steps/Step7PricingStrategy";
import Step8PresentationMarketing from "./steps/Step8PresentationMarketing";
import Step9Review from "./steps/Step9Review";

import {
  enqueueAppraisalJob,
  processAppraisalQueue,
  type AppraisalJobPayload,
} from "@/lib/offline/appraisalQueue";

export type AppraisalFormProps = {
  mode: "create" | "edit";
  appraisalId?: number;
  initialForm?: FormState | null;
  /** Optional contact passed when starting an appraisal from a contact detail page */
  prefillContact?: any | null;
  propertyId?: number | null;
};

const MAX_STEP: Step = 9;

const STEP_PILLS: { id: Step; label: string }[] = [
  { id: 1, label: "Overview" },
  { id: 2, label: "Property" },
  { id: 3, label: "Interior" },
  { id: 4, label: "Exterior" },
  { id: 5, label: "Owner & occupancy" },
  { id: 6, label: "Motivation" },
  { id: 7, label: "Pricing" },
  { id: 8, label: "Presentation" },
  { id: 9, label: "Review" },
];

function stepLabel(s: Step): string {
  const labels: Record<number, string> = {
    1: "Appraisal overview",
    2: "Property basics & site",
    3: "Interior rooms",
    4: "Exterior & structures",
    5: "Owner & occupancy",
    6: "Motivation & expectations",
    7: "Pricing & strategy",
    8: "Presentation, marketing & follow-up",
    9: "Review",
  };
  return labels[s as number];
}

const AppraisalForm: React.FC<AppraisalFormProps> = ({
  mode,
  appraisalId,
  initialForm,
  prefillContact,
  propertyId = null,
}) => {
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  // Offline / queue state
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ---------------------------------------------------------
  // FORM STATE (WITH PREFILL CONTACT SUPPORT)
  // ---------------------------------------------------------
  const [form, setForm] = useState<FormState>(() => {
    // If editing an existing appraisal
    if (initialForm) {
      const contactIds = (initialForm.contactIds ?? [])
        .map((v: any) => Number(v))
        .filter((n) => Number.isFinite(n));

      return {
        ...EMPTY_FORM,
        ...initialForm,
        contactIds,
        linkedContactId: initialForm.linkedContactId ?? contactIds[0] ?? null,
      };
    }

    // New appraisal
    let base: FormState = { ...EMPTY_FORM };

    // We keep propertyId as a prop only (not inside form)

    if (prefillContact) {
      const idRaw = prefillContact.id;
      const contactId =
        typeof idRaw === "number" ? idRaw : Number.parseInt(String(idRaw), 10);

      const validId = Number.isFinite(contactId) ? contactId : undefined;

      base = {
        ...base,
        linkedContactId: validId ?? null,
        contactIds: validId ? [validId] : [],
        ownerNames:
          prefillContact.full_name ??
          ([prefillContact.first_name, prefillContact.last_name]
            .filter(Boolean)
            .join(" ") ||
            base.ownerNames),
        ownerPhonePrimary: prefillContact.phone ?? base.ownerPhonePrimary,
        ownerEmail: prefillContact.email ?? base.ownerEmail,
      };
    }

    return base;
  });

  // ---------------------------------------------------------
  // CONTACT OPTIONS FOR LINKING MULTIPLE CONTACTS
  // ---------------------------------------------------------

  const [contactOptions, setContactOptions] = useState<MinimalContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadContacts = async () => {
      try {
        setContactsLoading(true);

        const res = await fetch("/api/contacts");

        if (!res.ok) {
          const txt = await res.text();
          console.error("Failed to load contacts for linking", txt);
          return;
        }

        const json = await res.json();
        console.log("🟢 Contacts JSON for linking:", json);

        const rawList = Array.isArray(json)
          ? json
          : Array.isArray(json.items)
          ? json.items
          : [];

        const mapped: MinimalContact[] = rawList.map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email ?? null,
          phoneMobile: c.phone_mobile ?? c.mobile ?? c.phone ?? null,
        }));

        if (!cancelled) {
          setContactOptions(mapped);
        }
      } catch (err) {
        console.error("Unexpected error loading contacts for linking", err);
      } finally {
        if (!cancelled) {
          setContactsLoading(false);
        }
      }
    };

    void loadContacts();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------
  // OFFLINE QUEUE: process on mount / when coming online
  // ---------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const syncNow = async () => {
      if (typeof window === "undefined") return;
      setSyncing(true);
      try {
        const processed = await processAppraisalQueue();
        if (!cancelled && processed > 0) {
          console.log(`[offline] synced ${processed} queued appraisal(s)`);
        }
      } finally {
        if (!cancelled) setSyncing(false);
      }
    };

    syncNow();

    const handleOnline = () => {
      void syncNow();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
      }
    };
  }, []);

  const toggleLinkedContact = (id: number) => {
    setForm((prev) => {
      const current = new Set(prev.contactIds ?? []);
      if (current.has(id)) {
        current.delete(id);
      } else {
        current.add(id);
      }
      const contactIds = Array.from(current);
      return {
        ...prev,
        contactIds,
        linkedContactId: contactIds[0] ?? null,
      };
    });
  };

  // ---------------------------------------------------------
  // GENERIC UPDATE HELPERS
  // ---------------------------------------------------------

  const updateField = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayValue = (key: keyof FormState, value: string) => {
    setForm((prev) => {
      const current = (prev[key] as string[]) || [];
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter((v) => v !== value) };
      }
      return { ...prev, [key]: [...current, value] };
    });
  };

  // Rooms
  const addRoom = () => {
    setForm((prev) => {
      const currentRooms = prev.rooms ?? [];
      return {
        ...prev,
        rooms: [
          ...currentRooms,
          {
            id: Date.now(),
            label: `Room ${currentRooms.length + 1}`,
            type: "bedroom",
          } as Room,
        ],
      };
    });
  };

  const updateRoom = (id: number, key: keyof Room, value: any) => {
    setForm((prev) => {
      const currentRooms = prev.rooms ?? [];
      return {
        ...prev,
        rooms: currentRooms.map((room) =>
          room.id === id ? { ...room, [key]: value } : room
        ),
      };
    });
  };

  const deleteRoom = (id: number) => {
    setForm((prev) => {
      const currentRooms = prev.rooms ?? [];
      return {
        ...prev,
        rooms: currentRooms.filter((room) => room.id !== id),
      };
    });
  };

  // Exterior
  const addExteriorArea = () => {
    setForm((prev) => {
      const current = prev.exteriorAreas ?? [];
      return {
        ...prev,
        exteriorAreas: [
          ...current,
          {
            id: Date.now(),
            label: `Area ${current.length + 1}`,
            type: "patio",
          } as ExteriorArea,
        ],
      };
    });
  };

  const updateExteriorArea = (
    id: number,
    key: keyof ExteriorArea,
    value: any
  ) => {
    setForm((prev) => {
      const current = prev.exteriorAreas ?? [];
      return {
        ...prev,
        exteriorAreas: current.map((area) =>
          area.id === id ? { ...area, [key]: value } : area
        ),
      };
    });
  };

  const deleteExteriorArea = (id: number) => {
    setForm((prev) => {
      const current = prev.exteriorAreas ?? [];
      return {
        ...prev,
        exteriorAreas: current.filter((area) => area.id !== id),
      };
    });
  };

  const updateNonPriceGoal = (key: keyof NonPriceGoals, value: number) => {
    setForm((prev) => {
      const base: NonPriceGoals = prev.nonPriceGoals ?? {
        bestPrice: 3,
        speed: 3,
        minimalDisruption: 3,
        privacy: 3,
        longSettlement: 3,
      };

      return {
        ...prev,
        nonPriceGoals: {
          ...base,
          [key]: value,
        },
      };
    });
  };

  const goNext = () => {
    setStep((prev) => {
      if (prev >= MAX_STEP) return prev;
      return (prev + 1) as Step;
    });
  };

  const goBack = () => {
    setStep((prev) => {
      if (prev <= 1) return prev;
      return (prev - 1) as Step;
    });
  };

  const handleSameAsPropertyToggle = (checked: boolean) => {
    if (checked) {
      updateField(
        "postalAddress",
        `${form.streetAddress}, ${form.suburb} ${form.postcode} ${form.state}`
      );
    }
    updateField("sameAsProperty", checked);
  };

  // ---------------------------------------------------------
  // SAVE / DELETE (WITH OFFLINE QUEUE FOR NEW APPRAISALS)
  // ---------------------------------------------------------

  const handleSave = async (markComplete: boolean) => {
    if (saving) return;
    setSaving(true);

    try {
      if (!form.streetAddress || !form.suburb || !form.postcode) {
        alert(
          "Please fill in street address, suburb and postcode before saving."
        );
        return;
      }

      const payload = {
        status: markComplete ? "COMPLETED" : "DRAFT",
        appraisalTitle: form.appraisalTitle,
        streetAddress: form.streetAddress,
        suburb: form.suburb,
        postcode: form.postcode,
        state: form.state || "WA",
        data: form,
        contactIds: form.contactIds ?? [],
        // ✅ Use the prop only; don't touch form.propertyId
        property_id: propertyId ?? null,
      };

      const isEditing = mode === "edit" && appraisalId;

      const url = isEditing
        ? `/api/appraisals/${appraisalId}`
        : "/api/appraisals";

      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Save error status:", res.status, res.statusText);
        console.error("Save error body:", text);
        alert("There was a problem saving the appraisal.");
        return;
      }

      const saved = await res.json();
      console.log("Saved appraisal:", saved);

      // 🔎 Try to pull the new ID out of the response
      let newId: number | null = null;

      if (saved) {
        // Adjust this branch if your API shape is different
        if (saved.appraisal?.id) {
          newId = saved.appraisal.id as number;
        } else if (saved.id) {
          newId = saved.id as number;
        }
      }

      // 🧠 If we just CREATED a new appraisal, jump to the edit page for it
      if (mode === "create" && newId) {
        alert(
          markComplete
            ? "Appraisal saved and marked as completed."
            : "Appraisal saved as draft."
        );
        window.location.href = `/appraisals/${newId}/edit`;
        return;
      }

      // Normal edit case (already on /edit route)
      alert(
        markComplete
          ? "Appraisal saved and marked as completed."
          : "Appraisal saved as draft."
      );
    } catch (err) {
      console.error("Save error (network/JS):", err);
      alert("Unexpected error while saving the appraisal.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!appraisalId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this appraisal? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/appraisals/${appraisalId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Delete error:", text);
        alert("Failed to delete appraisal.");
        return;
      }

      alert("Appraisal deleted.");
      window.location.href = "/appraisals";
    } catch (err) {
      console.error(err);
      alert("Something went wrong deleting appraisal.");
    }
  };

  const progressPercent = (step / 9) * 100;

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-slate-900 text-center text-sm font-bold text-white leading-8">
              B
            </div>
            <div>
              <div className="text-sm font-semibold">Appraisal Capture</div>
              <div className="text-xs text-slate-500">
                app.sellwithbrent.com.au
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              {mode === "create" ? "New appraisal" : "Editing appraisal"}
            </span>

            {mode === "edit" && appraisalId && (
              <Link
                href={`/appraisals/${appraisalId}/summary`}
                className="rounded-full border border-slate-300 px-3 py-1 font-medium text-slate-700 hover:bg-slate-100"
              >
                View summary
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {mode === "create" ? "New appraisal" : "Edit appraisal"}
            </h1>
            <p className="text-sm text-slate-500">
              Step {step} of 9 · {stepLabel(step)}
            </p>
          </div>
          <div className="hidden text-xs text-slate-500 sm:block">
            Changes are saved back to your database via the API routes.
          </div>
        </div>

        {/* Offline / sync status */}
        <div className="mb-4 space-y-2">
          {offlineSaved && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              This appraisal has been stored on this device and will sync when
              you are back online.
            </div>
          )}
          {syncing && (
            <div className="rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-800">
              Syncing offline appraisals…
            </div>
          )}
          {saveError && (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
              {saveError}
            </div>
          )}
        </div>

        {/* Step pills */}
        <div className="mb-4 flex flex-wrap gap-1">
          {STEP_PILLS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setStep(pill.id)}
              className={[
                "rounded-full border px-2.5 py-1 text-[11px]",
                step === pill.id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100",
              ].join(" ")}
            >
              <span className="mr-1 text-[10px] opacity-70">{pill.id}</span>
              {pill.label}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mb-6 h-2 w-full rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-slate-900 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Card wrapper for step content */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          {step === 1 && (
            <Step1Overview form={form} updateField={updateField} />
          )}

          {step === 2 && (
            <Step2PropertyBasics
              form={form}
              updateField={updateField}
              toggleArrayValue={toggleArrayValue}
            />
          )}

          {step === 3 && (
            <Step3Rooms
              form={form}
              updateField={updateField}
              addRoom={addRoom}
              updateRoom={updateRoom}
              deleteRoom={deleteRoom}
            />
          )}

          {step === 4 && (
            <Step4Exterior
              form={form}
              updateField={(key: any, value: any) =>
                updateField(key as any, value as any)
              }
              addExterior={addExteriorArea}
              updateExterior={updateExteriorArea}
              deleteExterior={deleteExteriorArea}
            />
          )}

          {step === 5 && (
            <Step5OwnerOccupancy
              form={form}
              updateField={updateField}
              handleSameAsPropertyToggle={handleSameAsPropertyToggle}
              contactOptions={contactOptions}
              linkedContactIds={form.contactIds ?? []}
              onAddLinkedContact={toggleLinkedContact}
              onRemoveLinkedContact={toggleLinkedContact}
              contactsLoading={contactsLoading}
            />
          )}

          {step === 6 && (
            <Step6Motivation
              form={form}
              updateField={updateField}
              updateNonPriceGoal={updateNonPriceGoal}
            />
          )}

          {step === 7 && (
            <Step7PricingStrategy form={form} updateField={updateField} />
          )}

          {step === 8 && (
            <Step8PresentationMarketing
              form={form}
              updateField={updateField}
              toggleArrayValue={toggleArrayValue}
            />
          )}

          {step === 9 && (
            <Step9Review form={form} onEditStep={(s) => setStep(s)} />
          )}
        </div>

        {/* Navigation buttons */}
        <div className="mt-6 border-t pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Back button – hidden on step 1 */}
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>

            {/* Right-side buttons */}
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              {/* Save draft – always visible */}
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
              >
                {saving ? "Saving…" : "Save draft"}
              </button>

              {/* Save & complete – always visible */}
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                {saving ? "Saving…" : "Save & complete"}
              </button>

              {/* Delete – only when editing */}
              {mode === "edit" && appraisalId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Delete
                </button>
              )}

              {/* Next – hide on final step */}
              {step < 9 && (
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppraisalForm;
