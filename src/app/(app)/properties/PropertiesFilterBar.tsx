"use client";

import { useRouter, usePathname } from "next/navigation";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "appraisal", label: "Appraisal" },
  { value: "for_sale", label: "For sale" },
  { value: "under_offer", label: "Under offer" },
  { value: "sold", label: "Sold" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "leased", label: "Leased" },
  { value: "for_rent", label: "For rent" },
];

const PROPERTY_TYPES = [
  { value: "", label: "All types" },
  { value: "house", label: "House" },
  { value: "unit", label: "Unit" },
  { value: "apartment", label: "Apartment" },
  { value: "townhouse", label: "Townhouse" },
  { value: "villa", label: "Villa" },
  { value: "land", label: "Land" },
  { value: "rural", label: "Rural" },
  { value: "commercial", label: "Commercial" },
];

type Props = {
  currentStatus: string;
  currentPropertyType: string;
};

export function PropertiesFilterBar({ currentStatus, currentPropertyType }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams();
    const current: Record<string, string> = {
      status: currentStatus,
      property_type: currentPropertyType,
      ...updates,
    };
    for (const [k, v] of Object.entries(current)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const hasFilters = currentStatus || currentPropertyType;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={currentStatus}
        onChange={(e) => updateParams({ status: e.target.value })}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        value={currentPropertyType}
        onChange={(e) => updateParams({ property_type: e.target.value })}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm"
      >
        {PROPERTY_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={() => router.push(pathname)}
          className="text-xs text-slate-500 hover:text-slate-700 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
