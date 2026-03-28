"use client";

import { useRouter, usePathname } from "next/navigation";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

const PRIORITIES = [
  { value: "", label: "All priorities" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];

type Props = {
  currentStatus: string;
  currentPriority: string;
};

export function TasksFilterBar({ currentStatus, currentPriority }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams();
    const current: Record<string, string> = {
      status: currentStatus,
      priority: currentPriority,
      ...updates,
    };
    for (const [k, v] of Object.entries(current)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const hasFilters = currentStatus || currentPriority;

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
        value={currentPriority}
        onChange={(e) => updateParams({ priority: e.target.value })}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm"
      >
        {PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
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
