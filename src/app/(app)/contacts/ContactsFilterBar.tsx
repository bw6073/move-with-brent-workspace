"use client";

import { useRouter, usePathname } from "next/navigation";

const STAGES = [
  { value: "", label: "All stages" },
  { value: "new_enquiry", label: "New enquiry" },
  { value: "active_opportunity", label: "Active opportunity" },
  { value: "appraisal_booked", label: "Appraisal booked" },
  { value: "listed", label: "Listed" },
  { value: "sold", label: "Sold" },
  { value: "nurture", label: "Nurture" },
  { value: "inactive", label: "Inactive" },
];

const RATINGS = [
  { value: "", label: "All ratings" },
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" },
];

type Props = {
  currentStage: string;
  currentRating: string;
  isBuyer: boolean;
  isSeller: boolean;
};

export function ContactsFilterBar({
  currentStage,
  currentRating,
  isBuyer,
  isSeller,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams();
    const current: Record<string, string> = {
      stage: currentStage,
      rating: currentRating,
      is_buyer: isBuyer ? "true" : "",
      is_seller: isSeller ? "true" : "",
      ...updates,
    };
    for (const [k, v] of Object.entries(current)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const hasFilters = currentStage || currentRating || isBuyer || isSeller;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={currentStage}
        onChange={(e) => updateParams({ stage: e.target.value })}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm"
      >
        {STAGES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        value={currentRating}
        onChange={(e) => updateParams({ rating: e.target.value })}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm"
      >
        {RATINGS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      <button
        onClick={() => updateParams({ is_buyer: isBuyer ? "" : "true" })}
        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
          isBuyer
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        Buyers
      </button>

      <button
        onClick={() => updateParams({ is_seller: isSeller ? "" : "true" })}
        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
          isSeller
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        Sellers
      </button>

      {hasFilters && (
        <button
          onClick={() =>
            router.push(pathname)
          }
          className="text-xs text-slate-500 hover:text-slate-700 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
