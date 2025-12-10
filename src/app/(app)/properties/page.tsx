import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
  market_status: string | null;
  created_at: string | null;
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
      return "Appraisal";
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

export default async function PropertiesPage() {
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
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load properties", JSON.stringify(error, null, 2));
  }

  const rows: PropertyRow[] = (data ?? []) as PropertyRow[];

  const properties = rows.map((p) => {
    const fullAddress = [
      p.street_address,
      p.suburb,
      p.state || "WA",
      p.postcode,
    ]
      .filter(Boolean)
      .join(" ");

    const created = formatDate(p.created_at);

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

    return {
      ...p,
      fullAddress,
      created,
      beds,
      baths,
      cars,
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* HEADER */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Properties</h1>
          <p className="text-sm text-slate-500">
            Properties you&apos;re tracking – link contacts, appraisals and
            campaigns.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* This will 404 until we build /properties/new – safe placeholder for now */}
          <Link
            href="/properties/new"
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            + New property
          </Link>
          <Link
            href="/appraisals"
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            View appraisals
          </Link>
        </div>
      </header>

      {/* TABLE CARD */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {properties.length === 0 ? (
          <p className="text-sm text-slate-500">
            No properties yet. Once we add the &ldquo;New property&rdquo; form
            you can start building your portfolio here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-2 pr-4">Address</th>
                  <th className="py-2 px-4">Type</th>
                  <th className="py-2 px-4">Beds/Baths/Cars</th>
                  <th className="py-2 px-4">Status</th>
                  <th className="py-2 px-4">Created</th>
                  <th className="py-2 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="py-2 pr-4 text-slate-900">
                      <div className="font-medium truncate">
                        {p.fullAddress || "Untitled property"}
                      </div>
                      {p.street_address && (
                        <div className="text-xs text-slate-500 truncate">
                          {p.street_address}
                          {p.suburb ? `, ${p.suburb}` : ""}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-4 text-slate-700">
                      {p.property_type || "—"}
                    </td>
                    <td className="py-2 px-4 text-slate-700">
                      {p.beds ?? "–"} / {p.baths ?? "–"} / {p.cars ?? "–"}
                    </td>
                    <td className="py-2 px-4 text-slate-700">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${statusClass(
                          p.market_status
                        )}`}
                      >
                        {statusLabel(p.market_status)}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-slate-700">
                      {p.created || "—"}
                    </td>
                    <td className="py-2 pl-4 text-right">
                      <Link
                        href={`/properties/${p.id}`}
                        className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
                      >
                        View
                      </Link>
                      {/* Later we can link appraisals, contacts, etc from here */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
