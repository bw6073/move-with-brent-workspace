// src/app/(app)/appraisals/[id]/summary/AppraisalSummaryClient.tsx
"use client";

import React from "react";
import type { FormState } from "@/components/appraisal/config/types";
import { ROOM_FEATURE_CONFIG } from "@/components/appraisal/config/roomFeatures";
import { EXTERIOR_FEATURE_CONFIG } from "@/components/appraisal/config/exteriorFeatures";

type AppraisalRecord = {
  id: number;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Props = {
  appraisal: AppraisalRecord;
  form: FormState;
};

type RoomLike = {
  id: number;
  label?: string | null;
  type?: string | null;
  lengthMetres?: string | null;
  widthMetres?: string | null;
  conditionRating?: string | number | null;
  flooring?: string | null;
  heatingCooling?: string | null;
  specialFeatures?: string | null;
  extraFields?: Record<string, unknown> | null;
};

type ExteriorLike = {
  id: number;
  label?: string | null;
  type?: string | null;
  lengthMetres?: string | null;
  widthMetres?: string | null;
  heightMetres?: string | null;
  extraFields?: Record<string, unknown> | null;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "—";

  if (typeof value === "string") {
    const v = value.trim();
    return v === "" ? "—" : v;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (
      value.every((v) => ["string", "number", "boolean"].includes(typeof v))
    ) {
      return value.map((v) => String(v)).join(", ");
    }
    return JSON.stringify(value);
  }

  return JSON.stringify(value);
};

const prettifyKey = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());

const safeFilePart = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const getRoomConfig = (type: string | null | undefined) => {
  const t = (type || "other") as keyof typeof ROOM_FEATURE_CONFIG;
  return ROOM_FEATURE_CONFIG[t] ?? ROOM_FEATURE_CONFIG.other ?? [];
};

const getExteriorConfig = (type: string | null | undefined) => {
  const t = (type || "other") as keyof typeof EXTERIOR_FEATURE_CONFIG;
  return EXTERIOR_FEATURE_CONFIG[t] ?? EXTERIOR_FEATURE_CONFIG.other ?? [];
};

const labelledExtrasFromConfig = (
  config: Array<{ id: string; label: string }>,
  extraFields: Record<string, unknown> | null | undefined,
  opts?: { hideNo?: boolean }
) => {
  const hideNo = opts?.hideNo ?? false;
  const extra = extraFields ?? {};

  return config
    .map((f) => {
      const raw = extra[f.id];
      if (raw === null || raw === undefined) return null;

      const value = String(raw).trim();
      if (!value) return null;

      if (hideNo) {
        const v = value.toLowerCase();
        if (v === "no" || v === "false") return null;
      }

      return `${f.label}: ${value}`;
    })
    .filter(Boolean) as string[];
};

const sizeLine = (a?: string | null, b?: string | null, c?: string | null) => {
  const parts: string[] = [];
  if (a || b) parts.push(`${a || "?"}m x ${b || "?"}m`);
  if (c) parts.push(`H: ${c}m`);
  return parts.join(" · ");
};

export function AppraisalSummaryClient({ appraisal, form }: Props) {
  const handlePrint = () => window.print();

  const fullAddress = [
    form.streetAddress,
    form.suburb,
    form.state || "WA",
    form.postcode,
  ]
    .filter(Boolean)
    .join(" ");

  const rooms = (form.rooms ?? []) as unknown as RoomLike[];
  const exteriorAreas = (form.exteriorAreas ?? []) as unknown as ExteriorLike[];

  const nonPriceGoalLines = (() => {
    const g = form.nonPriceGoals;
    if (!g) return [];
    const lines: string[] = [];
    if (g.bestPrice !== undefined)
      lines.push(`Best possible price: ${g.bestPrice}/5`);
    if (g.speed !== undefined) lines.push(`Speed of sale: ${g.speed}/5`);
    if (g.minimalDisruption !== undefined)
      lines.push(`Minimal disruption: ${g.minimalDisruption}/5`);
    if (g.privacy !== undefined)
      lines.push(`Privacy / low profile: ${g.privacy}/5`);
    if (g.longSettlement !== undefined)
      lines.push(`Long settlement / rent-back: ${g.longSettlement}/5`);
    return lines;
  })();

  // ---------------- PDF DOWNLOAD ----------------
  const handleDownloadPdf = async () => {
    const { default: jsPDF } = await import("jspdf");

    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const marginX = 40;
    const maxWidth = 515;
    const lineHeight = 14;
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 60;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - 40) {
        doc.addPage();
        y = 40;
      }
    };

    const addSectionTitle = (title: string) => {
      ensureSpace(lineHeight * 2);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(title, marginX, y);
      y += lineHeight;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    };

    const addLabelValue = (label: string, value: string | undefined) => {
      const safeValue = value && value.trim() !== "" ? value : "—";
      const text = `${label}: ${safeValue}`;
      const lines = doc.splitTextToSize(text, maxWidth);
      ensureSpace(lineHeight * (lines.length + 0.5));
      doc.text(lines, marginX, y);
      y += lineHeight * (lines.length + 0.3);
    };

    const addParagraph = (text: string | undefined) => {
      const safeText = text && text.trim() !== "" ? text : "—";
      const lines = doc.splitTextToSize(safeText, maxWidth);
      ensureSpace(lineHeight * (lines.length + 0.5));
      doc.text(lines, marginX, y);
      y += lineHeight * (lines.length + 0.3);
    };

    const addBullet = (label: string, value: string) => {
      const safeValue = value && value.trim() !== "" ? value : "—";
      const text = `• ${label}: ${safeValue}`;
      const lines = doc.splitTextToSize(text, maxWidth);
      ensureSpace(lineHeight * (lines.length + 0.5));
      doc.text(lines, marginX, y);
      y += lineHeight * (lines.length + 0.3);
    };

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);

    const title =
      form.appraisalTitle ||
      fullAddress ||
      `Appraisal #${String(appraisal.id)}`;

    doc.text("Appraisal Summary", marginX, 30);
    doc.setFontSize(11);
    doc.text(title, marginX, 46);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Status: ${appraisal.status ?? "DRAFT"} · Created: ${formatDate(
        appraisal.created_at
      )} · Last updated: ${formatDate(appraisal.updated_at)}`,
      marginX,
      60
    );

    y = 80;
    doc.setFontSize(10);

    // 1. Overview
    addSectionTitle("1. Overview");
    addLabelValue("Property type", form.propertyType || "—");
    addLabelValue("Appraisal date", form.appraisalDate || "—");
    addLabelValue("Source of enquiry", form.sourceOfEnquiry || "—");
    addParagraph(
      form.firstContactNotes ||
        "Notes about first contact not recorded in this appraisal."
    );

    // 2. Property basics & site
    addSectionTitle("2. Property basics & site");
    addLabelValue("Year built", form.yearBuilt || "—");
    addLabelValue("Construction", form.construction || "—");

    const landLineParts: string[] = [];
    if (form.landArea) {
      landLineParts.push(
        `${form.landArea} ${form.landAreaUnit ? form.landAreaUnit : ""}`.trim()
      );
    }
    if (form.zoning) landLineParts.push(`Zoning: ${form.zoning}`);
    addLabelValue("Land size & zoning", landLineParts.join(" · ") || "—");

    addLabelValue(
      "Block shape / slope",
      [
        form.blockShape ? `Shape: ${form.blockShape}` : "",
        form.slope ? `Slope: ${form.slope}` : "",
      ]
        .filter(Boolean)
        .join(" · ") || "—"
    );

    addLabelValue("Outlook / views", form.outlook || "—");

    addLabelValue(
      "Bedrooms / bathrooms / WCs / car",
      [
        form.bedrooms || "–",
        form.bathrooms || "–",
        form.wcs || "–",
        form.carSpaces || "–",
      ].join(" / ")
    );

    addLabelValue(
      "Services",
      form.services && form.services.length > 0 ? form.services.join(", ") : "—"
    );

    addLabelValue(
      "Outdoor features",
      form.outdoorFeatures && form.outdoorFeatures.length > 0
        ? form.outdoorFeatures.join(", ")
        : "—"
    );

    // 3. Interior
    addSectionTitle("3. Interior");
    addLabelValue("Overall condition", form.overallCondition || "—");
    addLabelValue("Style / theme", form.styleTheme || "—");
    addParagraph(
      (form as any).interiorNotes ||
        "No general interior notes recorded in this appraisal."
    );

    if (rooms.length > 0) {
      addLabelValue("Rooms (count)", String(rooms.length));

      rooms.forEach((room) => {
        const label = room.label || room.type || "Room";

        const parts: string[] = [];

        const s = sizeLine(room.lengthMetres, room.widthMetres);
        if (s) parts.push(s);

        if (room.conditionRating)
          parts.push(`Condition: ${String(room.conditionRating)}/5`);

        if (room.flooring) parts.push(`Flooring: ${room.flooring}`);
        if (room.heatingCooling)
          parts.push(`Heating/cooling: ${room.heatingCooling}`);

        const extras = labelledExtrasFromConfig(
          getRoomConfig(room.type || "other"),
          room.extraFields,
          { hideNo: false }
        );
        if (extras.length) parts.push(extras.join(" · "));

        if (room.specialFeatures) parts.push(room.specialFeatures);

        addBullet(label, parts.join(" · ") || "—");
      });
    }

    // 4. Exterior & land
    addSectionTitle("4. Exterior & land");
    addParagraph(
      form.landscapeSummary ||
        "No general exterior / landscape summary recorded in this appraisal."
    );

    if (exteriorAreas.length > 0) {
      addLabelValue(
        "Structures / outdoor areas (count)",
        String(exteriorAreas.length)
      );

      exteriorAreas.forEach((area) => {
        const label = area.label || area.type || "Structure";

        const parts: string[] = [];
        const s = sizeLine(
          area.lengthMetres,
          area.widthMetres,
          area.heightMetres
        );
        if (s) parts.push(s);

        const extras = labelledExtrasFromConfig(
          getExteriorConfig(area.type || "other"),
          area.extraFields,
          { hideNo: false }
        );
        if (extras.length) parts.push(extras.join(" · "));

        addBullet(label, parts.join(" · ") || "—");
      });
    }

    // 5. Owner & occupancy
    addSectionTitle("5. Owner & occupancy");
    addLabelValue("Owner name(s)", form.ownerNames || "—");
    addLabelValue(
      "Owner contact",
      [
        form.ownerPhonePrimary || "",
        form.ownerPhoneSecondary || "",
        form.ownerEmail || "",
      ]
        .filter(Boolean)
        .join(" · ") || "—"
    );
    addLabelValue("Postal address", form.postalAddress || "—");
    addLabelValue("Occupancy type", form.occupancyType || "—");

    if (form.occupancyType === "TENANT") {
      addLabelValue("Tenant name", form.tenantName || "—");
      addLabelValue("Lease expiry", form.leaseExpiry || "—");
      addLabelValue("Current rent", form.currentRent || "—");
      addLabelValue("Rent frequency", form.rentFrequency || "—");
      addParagraph(form.tenantNotes || "No tenancy notes recorded.");
    }

    if (form.occupancyType === "OWNER") {
      addLabelValue("How long lived here", form.ownerHowLong || "—");
      addLabelValue("Next move", form.ownerNextMove || "—");
    }

    addLabelValue("Decision makers", form.decisionMakers || "—");
    addParagraph(
      form.decisionNotes || "No notes about the decision-making process."
    );

    // 6. Motivation & expectations
    addSectionTitle("6. Motivation & expectations");
    addLabelValue("Primary reason for moving", form.primaryReason || "—");
    addLabelValue("Ideal timeframe", form.idealTimeframe || "—");
    addParagraph(
      form.motivationDetail ||
        "No additional notes about the vendor’s motivation recorded."
    );
    addLabelValue("Dates to avoid", form.datesToAvoid || "—");

    if (nonPriceGoalLines.length > 0) {
      addParagraph(nonPriceGoalLines.join(" · "));
    }
    addParagraph(
      form.otherGoalNotes || "No extra notes about non-price goals recorded."
    );

    if (form.hasPriceExpectation) {
      addLabelValue(
        "Vendor expectation",
        `${form.expectationMin || "?"} – ${form.expectationMax || "?"}`
      );
      addLabelValue("Expectation source", form.expectationSource || "—");
      addParagraph(
        form.expectationComments ||
          "No further comments about vendor expectations recorded."
      );
    } else {
      addLabelValue("Vendor expectation", "Not specifically stated");
    }

    // 7. Pricing, preparation & fees
    addSectionTitle("7. Pricing, preparation & fees");
    addLabelValue(
      "Suggested price range",
      form.suggestedRangeMin || form.suggestedRangeMax
        ? `${form.suggestedRangeMin || "?"} – ${form.suggestedRangeMax || "?"}`
        : "—"
    );
    addLabelValue("Pricing strategy", form.pricingStrategy || "—");
    addParagraph(
      form.comparablesNotes ||
        "No comparable sales notes recorded in this appraisal."
    );
    addLabelValue("Must do before photography", form.mustDoPrep || "—");
    addLabelValue("Nice to have if possible", form.niceToHavePrep || "—");
    addLabelValue(
      "Fees / authority discussed",
      form.feesDiscussed ? "Yes" : "No"
    );
    if (form.feesDiscussed) {
      addLabelValue("Proposed selling fee", form.proposedFee || "—");
      addLabelValue("Likelihood of signing", form.agreementLikelihood || "—");
    }

    // 8. Presentation, marketing & follow-up
    addSectionTitle("8. Presentation, marketing & follow-up");
    addLabelValue(
      "Presentation score (1–10)",
      form.presentationScore !== null && form.presentationScore !== undefined
        ? String(form.presentationScore)
        : "Not scored"
    );
    addParagraph(
      form.presentationSummary ||
        "No one-line presentation summary recorded in this appraisal."
    );
    addParagraph(
      form.targetBuyerProfile ||
        "No target buyer profile recorded in this appraisal."
    );
    addParagraph(form.headlineIdeas || "No headline / angle ideas recorded.");
    addLabelValue(
      "Marketing channels",
      form.marketingChannels && form.marketingChannels.length > 0
        ? form.marketingChannels.join(", ")
        : "—"
    );
    addParagraph(
      form.followUpActions || "No follow-up actions recorded in this appraisal."
    );
    addLabelValue("Follow-up date", form.followUpDate || "—");

    const fileBase =
      safeFilePart(form.streetAddress || form.appraisalTitle || "summary") ||
      "summary";
    doc.save(`appraisal-${appraisal.id}-${fileBase}.pdf`);
  };

  // Keys shown explicitly above (so they don't repeat in "Additional details")
  const displayedKeys = new Set<string>([
    // Step 1
    "appraisalTitle",
    "streetAddress",
    "suburb",
    "state",
    "postcode",
    "appraisalDate",
    "sourceOfEnquiry",
    "firstContactNotes",

    // Step 2
    "propertyType",
    "yearBuilt",
    "construction",
    "landArea",
    "landAreaUnit",
    "zoning",
    "blockShape",
    "slope",
    "outlook",
    "bedrooms",
    "bathrooms",
    "wcs",
    "carSpaces",
    "services",
    "outdoorFeatures",

    // Step 3
    "overallCondition",
    "styleTheme",
    "interiorNotes",
    "rooms",

    // Step 4
    "landscapeSummary",
    "exteriorAreas",

    // Step 5
    "ownerNames",
    "ownerPhonePrimary",
    "ownerPhoneSecondary",
    "ownerEmail",
    "postalAddress",
    "sameAsProperty",
    "occupancyType",
    "tenantName",
    "leaseExpiry",
    "currentRent",
    "rentFrequency",
    "tenantNotes",
    "ownerHowLong",
    "ownerNextMove",
    "decisionMakers",
    "decisionNotes",

    // Step 6
    "primaryReason",
    "idealTimeframe",
    "motivationDetail",
    "datesToAvoid",
    "hasPriceExpectation",
    "expectationMin",
    "expectationMax",
    "expectationSource",
    "expectationComments",
    "nonPriceGoals",
    "otherGoalNotes",

    // Step 7
    "suggestedRangeMin",
    "suggestedRangeMax",
    "pricingStrategy",
    "comparablesNotes",
    "mustDoPrep",
    "niceToHavePrep",
    "feesDiscussed",
    "proposedFee",
    "agreementLikelihood",

    // Step 8
    "presentationScore",
    "presentationSummary",
    "targetBuyerProfile",
    "headlineIdeas",
    "marketingChannels",
    "followUpActions",
    "followUpDate",
  ]);

  const additionalEntries = Object.entries(form as Record<string, unknown>)
    .filter(([key, value]) => {
      if (displayedKeys.has(key)) return false;
      if (value === null || value === undefined) return false;
      if (value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm print:bg-white print:p-0 print:shadow-none">
      {/* Toolbar */}
      <div className="no-print flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Appraisal summary
          </h2>
          <p className="text-xs text-slate-500">
            Use “Print” or “Download PDF” to generate a copy for your records.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Print
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* Header */}
      <section className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          {form.appraisalTitle || fullAddress || `Appraisal #${appraisal.id}`}
        </h1>
        {fullAddress && (
          <p className="mt-1 text-sm text-slate-600">{fullAddress}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
          <div>
            <span className="font-semibold">Status:</span>{" "}
            {appraisal.status ?? "DRAFT"}
          </div>
          <div>
            <span className="font-semibold">Created:</span>{" "}
            {formatDate(appraisal.created_at)}
          </div>
          <div>
            <span className="font-semibold">Last updated:</span>{" "}
            {formatDate(appraisal.updated_at)}
          </div>
        </div>
      </section>

      {/* 1. Overview */}
      <section className="border-b border-slate-200 pb-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          1. Overview
        </h2>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Property type
            </p>
            <p className="text-slate-800">{form.propertyType || "—"}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">
              Appraisal date
            </p>
            <p className="text-slate-800">{form.appraisalDate || "—"}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">
              Source of enquiry
            </p>
            <p className="text-slate-800">{form.sourceOfEnquiry || "—"}</p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-slate-500">
              Notes about first contact
            </p>
            <p className="whitespace-pre-wrap text-slate-800">
              {form.firstContactNotes || "—"}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Property basics & site */}
      <section className="border-b border-slate-200 pb-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          2. Property basics & site
        </h2>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">Land size</p>
            <p className="text-slate-800">
              {form.landArea
                ? `${form.landArea} ${
                    form.landAreaUnit ? form.landAreaUnit : ""
                  }`
                : "—"}
              {form.zoning ? ` · Zoning: ${form.zoning}` : ""}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">Year built</p>
            <p className="text-slate-800">{form.yearBuilt || "—"}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">Construction</p>
            <p className="text-slate-800">{form.construction || "—"}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">
              Block shape / slope
            </p>
            <p className="text-slate-800">
              {[
                form.blockShape ? `Shape: ${form.blockShape}` : "",
                form.slope ? `Slope: ${form.slope}` : "",
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">
              Outlook / views
            </p>
            <p className="text-slate-800">{form.outlook || "—"}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">
              Beds / baths / WCs / car
            </p>
            <p className="text-slate-800">
              {form.bedrooms || "–"} / {form.bathrooms || "–"} /{" "}
              {form.wcs || "–"} / {form.carSpaces || "–"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">Services</p>
            <p className="text-slate-800">
              {form.services && form.services.length > 0
                ? form.services.join(", ")
                : "—"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">
              Outdoor features
            </p>
            <p className="text-slate-800">
              {form.outdoorFeatures && form.outdoorFeatures.length > 0
                ? form.outdoorFeatures.join(", ")
                : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Interior */}
      <section className="border-b border-slate-200 pb-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          3. Interior
        </h2>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Overall interior condition
            </p>
            <p className="text-slate-800">{form.overallCondition || "—"}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">
              Style / theme
            </p>
            <p className="text-slate-800">{form.styleTheme || "—"}</p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-slate-500">
              Interior notes
            </p>
            <p className="whitespace-pre-wrap text-slate-800">
              {(form as any).interiorNotes || "—"}
            </p>
          </div>
        </div>

        {rooms.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-slate-500">
              Rooms (summary)
            </p>
            <ul className="space-y-1 text-xs">
              {rooms.map((room) => {
                const label = room.label || room.type || "Room";

                const sizeBits: string[] = [];
                const s = sizeLine(room.lengthMetres, room.widthMetres);
                if (s) sizeBits.push(s);

                const detailBits: string[] = [];

                if (room.conditionRating) {
                  detailBits.push(
                    `Condition: ${String(room.conditionRating)}/5`
                  );
                }
                if (room.flooring)
                  detailBits.push(`Flooring: ${room.flooring}`);
                if (room.heatingCooling)
                  detailBits.push(`Heating/cooling: ${room.heatingCooling}`);

                const extras = labelledExtrasFromConfig(
                  getRoomConfig(room.type || "other"),
                  room.extraFields,
                  { hideNo: false }
                );
                if (extras.length) detailBits.push(...extras);

                return (
                  <li
                    key={room.id}
                    className="rounded border border-slate-200 px-2 py-1"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-slate-900">
                        {label}
                      </span>
                      {room.type && (
                        <span className="text-[11px] text-slate-500">
                          {room.type}
                        </span>
                      )}
                    </div>

                    {(room.lengthMetres || room.widthMetres) && (
                      <p className="mt-0.5 text-[11px] text-slate-700">
                        {sizeBits.join(" · ")}
                      </p>
                    )}

                    {detailBits.length > 0 && (
                      <p className="mt-0.5 text-[11px] text-slate-700">
                        {detailBits.join(" · ")}
                      </p>
                    )}

                    {room.specialFeatures && (
                      <p className="mt-0.5 text-[11px] text-slate-700">
                        {room.specialFeatures}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* 4. Exterior & land */}
      <section className="border-b border-slate-200 pb-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          4. Exterior & land
        </h2>

        <div className="space-y-2 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Exterior notes & landscape summary
            </p>
            <p className="whitespace-pre-wrap text-slate-800">
              {form.landscapeSummary || "—"}
            </p>
          </div>
        </div>

        {exteriorAreas.length > 0 && (
          <div className="mt-3 space-y-2 text-xs">
            <p className="text-xs font-semibold text-slate-500">
              Structures / outdoor areas
            </p>
            <ul className="space-y-1">
              {exteriorAreas.map((area) => {
                const label = area.label || area.type || "Structure";

                const detailBits: string[] = [];
                const s = sizeLine(
                  area.lengthMetres,
                  area.widthMetres,
                  area.heightMetres
                );
                if (s) detailBits.push(s);

                const extras = labelledExtrasFromConfig(
                  getExteriorConfig(area.type || "other"),
                  area.extraFields,
                  { hideNo: false }
                );
                if (extras.length) detailBits.push(...extras);

                return (
                  <li
                    key={area.id}
                    className="rounded border border-slate-200 px-2 py-1"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-slate-900">
                        {label}
                      </span>
                      {area.type && (
                        <span className="text-[11px] text-slate-500">
                          {area.type}
                        </span>
                      )}
                    </div>

                    {detailBits.length > 0 && (
                      <p className="mt-0.5 text-[11px] text-slate-700">
                        {detailBits.join(" · ")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* 5. Owner & occupancy */}
      <section className="border-b border-slate-200 pb-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          5. Owner & occupancy
        </h2>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Owner name(s)
            </p>
            <p className="text-slate-800">{form.ownerNames || "—"}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">
              Primary phone / email
            </p>
            <p className="text-slate-800">
              {form.ownerPhonePrimary || "—"}
              {form.ownerEmail ? ` · ${form.ownerEmail}` : ""}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">
              Postal address
            </p>
            <p className="text-slate-800">{form.postalAddress || "—"}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">Occupancy</p>
            <p className="text-slate-800">{form.occupancyType || "—"}</p>
          </div>
        </div>

        {form.occupancyType === "TENANT" && (
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 text-xs sm:grid-cols-3">
              <div>
                <p className="font-semibold text-slate-500">Tenant name</p>
                <p className="text-slate-800">{form.tenantName || "—"}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-500">Lease expiry</p>
                <p className="text-slate-800">{form.leaseExpiry || "—"}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-500">
                  Current rent / frequency
                </p>
                <p className="text-slate-800">
                  {(form.currentRent || "—") +
                    (form.rentFrequency ? ` (${form.rentFrequency})` : "")}
                </p>
              </div>
            </div>

            <div className="text-sm">
              <p className="text-xs font-semibold text-slate-500">
                Tenancy notes
              </p>
              <p className="whitespace-pre-wrap text-slate-800">
                {form.tenantNotes || "—"}
              </p>
            </div>
          </div>
        )}

        {form.occupancyType === "OWNER" && (
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-slate-500">
                How long lived here
              </p>
              <p className="text-slate-800">{form.ownerHowLong || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Next move</p>
              <p className="text-slate-800">{form.ownerNextMove || "—"}</p>
            </div>
          </div>
        )}

        {(form.decisionMakers || form.decisionNotes) && (
          <div className="mt-3 text-sm">
            <p className="text-xs font-semibold text-slate-500">
              Decision makers & notes
            </p>
            <p className="text-slate-800">{form.decisionMakers || "—"}</p>
            {form.decisionNotes && (
              <p className="mt-1 whitespace-pre-wrap text-slate-800">
                {form.decisionNotes}
              </p>
            )}
          </div>
        )}
      </section>

      {/* 6. Motivation & expectations */}
      <section className="border-b border-slate-200 pb-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          6. Motivation & expectations
        </h2>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Primary reason for moving
            </p>
            <p className="text-slate-800">{form.primaryReason || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Ideal timeframe
            </p>
            <p className="text-slate-800">{form.idealTimeframe || "—"}</p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-slate-500">
              What&apos;s prompting the move?
            </p>
            <p className="whitespace-pre-wrap text-slate-800">
              {form.motivationDetail || "—"}
            </p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-slate-500">
              Dates to avoid
            </p>
            <p className="text-slate-800">{form.datesToAvoid || "—"}</p>
          </div>
        </div>

        {nonPriceGoalLines.length > 0 && (
          <div className="mt-3 text-sm">
            <p className="text-xs font-semibold text-slate-500">
              Non-price goals
            </p>
            <ul className="mt-1 space-y-0.5 text-xs text-slate-800">
              {nonPriceGoalLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-3 text-sm">
          <p className="text-xs font-semibold text-slate-500">
            Anything else that would make this a “win”?
          </p>
          <p className="whitespace-pre-wrap text-slate-800">
            {form.otherGoalNotes || "—"}
          </p>
        </div>

        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Vendor expectation
            </p>
            <p className="text-slate-800">
              {form.hasPriceExpectation
                ? `${form.expectationMin || "?"} – ${
                    form.expectationMax || "?"
                  }`
                : "Not specifically stated"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Expectation source
            </p>
            <p className="text-slate-800">{form.expectationSource || "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-slate-500">
              Comments about expectations
            </p>
            <p className="whitespace-pre-wrap text-slate-800">
              {form.expectationComments || "—"}
            </p>
          </div>
        </div>
      </section>

      {/* 7. Pricing, preparation & fees */}
      <section className="border-b border-slate-200 pb-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          7. Pricing, preparation & fees
        </h2>

        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Suggested range
            </p>
            <p className="text-slate-800">
              {form.suggestedRangeMin || form.suggestedRangeMax
                ? `${form.suggestedRangeMin || "?"} – ${
                    form.suggestedRangeMax || "?"
                  }`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Pricing strategy
            </p>
            <p className="text-slate-800">{form.pricingStrategy || "—"}</p>
          </div>
          <div className="sm:col-span-3">
            <p className="text-xs font-semibold text-slate-500">
              Comparable sales notes
            </p>
            <p className="whitespace-pre-wrap text-slate-800">
              {form.comparablesNotes || "—"}
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Must do before photography
            </p>
            <p className="whitespace-pre-wrap text-slate-800">
              {form.mustDoPrep || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Nice to have if possible
            </p>
            <p className="whitespace-pre-wrap text-slate-800">
              {form.niceToHavePrep || "—"}
            </p>
          </div>
        </div>

        <div className="mt-3 text-sm">
          <p className="text-xs font-semibold text-slate-500">
            Fees / authority discussed
          </p>
          <p className="text-slate-800">{form.feesDiscussed ? "Yes" : "No"}</p>
          {form.feesDiscussed && (
            <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Proposed selling fee
                </p>
                <p className="text-slate-800">{form.proposedFee || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Likelihood of signing
                </p>
                <p className="text-slate-800">
                  {form.agreementLikelihood || "—"}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 8. Presentation, marketing & follow-up */}
      <section className="border-b border-slate-200 pb-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          8. Presentation, marketing & follow-up
        </h2>

        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Presentation score (1–10)
            </p>
            <p className="text-slate-800">
              {form.presentationScore ?? "Not scored"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-slate-500">
              One-line presentation summary
            </p>
            <p className="text-slate-800">{form.presentationSummary || "—"}</p>
          </div>
        </div>

        <div className="mt-3 space-y-2 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Target buyer profile
            </p>
            <p className="whitespace-pre-wrap text-slate-800">
              {form.targetBuyerProfile || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Headline / angle ideas
            </p>
            <p className="whitespace-pre-wrap text-slate-800">
              {form.headlineIdeas || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Marketing channels
            </p>
            <p className="text-slate-800">
              {form.marketingChannels && form.marketingChannels.length > 0
                ? form.marketingChannels.join(", ")
                : "—"}
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Next steps & reminders
            </p>
            <p className="whitespace-pre-wrap text-slate-800">
              {form.followUpActions || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Follow-up date
            </p>
            <p className="text-slate-800">{form.followUpDate || "—"}</p>
          </div>
        </div>
      </section>

      {/* 9. Additional details */}
      {additionalEntries.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-slate-900">
            9. Additional details
          </h2>
          <p className="mb-2 text-xs text-slate-500">
            Fields captured in the appraisal that are not shown in the sections
            above.
          </p>

          <div className="overflow-hidden rounded border border-slate-200">
            <table className="w-full border-collapse text-xs">
              <tbody>
                {additionalEntries.map(([key, value]) => (
                  <tr
                    key={key}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <td className="w-1/3 bg-slate-50 px-3 py-1.5 font-semibold align-top text-slate-700">
                      {prettifyKey(key)}
                    </td>
                    <td className="px-3 py-1.5 align-top text-slate-800">
                      <span className="whitespace-pre-wrap">
                        {formatValue(value)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
