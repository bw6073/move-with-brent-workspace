// src/app/properties/[id]/page.tsx
import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PropertySideTabs } from "@/components/properties/PropertySideTabs";
import { PropertyOpenHomesPanel } from "./PropertyOpenHomesPanel";

type PageProps = {
  params: Promise<{ id: string }>;
};

type PropertyRow = {
  id: number;
  user_id: string;
  street_address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  car_spaces: number | null;
  land_size: number | null;
  land_size_unit: string | null;
  zoning: string | null;
  market_status: string | null;
  headline: string | null;
  description: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  [key: string]: any;
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

const statusLabel = (status: string | null | undefined) => {
  if (!status) return "Off market";
  switch (status) {
    case "appraisal":
      return "Appraisal only";
    case "pre_market":
      return "Pre-market";
    case "for_sale":
      return "For sale";
    case "under_offer":
      return "Under offer";
    case "sold":
      return "Sold";
    case "withdrawn":
      return "Withdrawn";
    case "off_market":
    default:
      return "Off market";
  }
};

const statusClass = (status: string | null | undefined) => {
  switch (status) {
    case "for_sale":
      return "bg-emerald-100 text-emerald-700";
    case "under_offer":
      return "bg-amber-100 text-amber-700";
    case "sold":
      return "bg-slate-200 text-slate-800";
    case "withdrawn":
      return "bg-red-100 text-red-700";
    case "appraisal":
      return "bg-indigo-100 text-indigo-700";
    case "pre_market":
      return "bg-purple-100 text-purple-700";
    case "off_market":
    default:
      return "bg-slate-100 text-slate-700";
  }
};

export default async function PropertyDetailPage({ params }: PageProps) {
  // ✅ Next 16: unwrap params (it's a Promise)
  const { id } = await params;
  const numericId = Number(id);

  if (Number.isNaN(numericId)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10 text-sm text-slate-600">
        Unauthorised – please sign in.
      </div>
    );
  }

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", numericId)
    .eq("user_id", user.id)
    .maybeSingle<PropertyRow>();

  if (error || !data) {
    console.error("Failed to load property", error);
    notFound();
  }

  const p = data;

  const fullAddress = [p.street_address, p.suburb, p.state || "WA", p.postcode]
    .filter(Boolean)
    .join(" ");

  const created = formatDate(p.created_at);
  const updated = formatDate(p.updated_at);

  const beds =
    typeof p.bedrooms === "number" && !Number.isNaN(p.bedrooms)
      ? p.bedrooms
      : null;
  const baths =
    typeof p.bathrooms === "number" && !Number.isNaN(p.bathrooms)
      ? p.bathrooms
      : null;
  const cars =
    typeof p.car_spaces === "number" && !Number.isNaN(p.car_spaces)
      ? p.car_spaces
      : null;

  const landText =
    p.land_size && p.land_size_unit
      ? `${p.land_size} ${p.land_size_unit}`
      : p.land_size
      ? String(p.land_size)
      : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-6 space-y-6">
      {/* HEADER */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {fullAddress || "Untitled property"}
          </h1>

          {p.headline && (
            <p className="mt-1 text-sm text-slate-600">{p.headline}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium uppercase tracking-wide ${statusClass(
                p.market_status
              )}`}
            >
              {statusLabel(p.market_status)}
            </span>

            {p.property_type && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5">
                {p.property_type}
              </span>
            )}
            {beds !== null && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5">
                {beds} bed
              </span>
            )}
            {baths !== null && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5">
                {baths} bath
              </span>
            )}
            {cars !== null && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5">
                {cars} car
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
          <Link
            href="/properties"
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            ← Back to properties
          </Link>

          <Link
            href={`/properties/${p.id}/edit`}
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Edit property
          </Link>

          <Link
            href={`/appraisals/new?propertyId=${p.id}`}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            + New appraisal
          </Link>
        </div>
      </header>

      {/* META BAR */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-xs text-slate-500">
        <div className="flex flex-wrap gap-4">
          <div>
            <span className="font-semibold text-slate-700">Created:</span>{" "}
            {created}
          </div>
          <div>
            <span className="font-semibold text-slate-700">Last updated:</span>{" "}
            {updated}
          </div>
          {landText && (
            <div>
              <span className="font-semibold text-slate-700">Land:</span>{" "}
              {landText}
            </div>
          )}
          {p.zoning && (
            <div>
              <span className="font-semibold text-slate-700">Zoning:</span>{" "}
              {p.zoning}
            </div>
          )}
        </div>
      </section>

      {/* MAIN GRID */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)]">
        {/* LEFT: main property details */}
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Property details
          </h2>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-slate-500">Address</p>
              <p className="text-slate-800">
                {fullAddress || "No address recorded"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">Type</p>
              <p className="text-slate-800">
                {p.property_type || "Not specified"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">
                Bedrooms / Bathrooms
              </p>
              <p className="text-slate-800">
                {beds ?? "–"} / {baths ?? "–"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">Car spaces</p>
              <p className="text-slate-800">{cars ?? "–"}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">Land size</p>
              <p className="text-slate-800">{landText || "—"}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">Zoning</p>
              <p className="text-slate-800">{p.zoning || "—"}</p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-slate-500">
                Description (internal)
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-slate-800">
                {p.description || "—"}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-slate-500">
                Notes (internal only)
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-slate-800">
                {p.notes || "—"}
              </p>
            </div>
          </div>
        </section>

        {/* RIGHT: side tabs + quick facts */}
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-sm">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">
              Quick facts
            </h2>
            <dl className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Status</dt>
                <dd className="font-medium text-slate-800">
                  {statusLabel(p.market_status)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Created</dt>
                <dd>{created}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Updated</dt>
                <dd>{updated}</dd>
              </div>
            </dl>
          </div>

          <PropertySideTabs propertyId={numericId} />
        </section>
      </div>

      {/* 🔥 Open homes for this property */}
      <PropertyOpenHomesPanel propertyId={numericId} />
    </div>
  );
}
