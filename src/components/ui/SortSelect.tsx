"use client";

import { useRouter, useSearchParams } from "next/navigation";

type SortOption = {
  label: string;
  value: string;
};

type SortSelectProps = {
  options: SortOption[];
  defaultValue: string;
};

export function SortSelect({ options, defaultValue }: SortSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentValue = searchParams.get("sort") ?? defaultValue;

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 text-xs sm:text-sm">
      <span className="text-slate-500">Sort by</span>
      <select
        className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-800 shadow-sm sm:text-sm"
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
