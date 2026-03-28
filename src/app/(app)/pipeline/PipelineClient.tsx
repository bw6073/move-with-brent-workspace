"use client";

import React, { useState } from "react";
import { PipelineBoard, type Deal } from "@/components/pipeline/PipelineBoard";
import { NewDealModal } from "@/components/pipeline/NewDealModal";

type Props = {
  initialDeals: Deal[];
};

export function PipelineClient({ initialDeals }: Props) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [modalOpen, setModalOpen] = useState(false);

  const handleCreated = (deal: Deal) => {
    setDeals((prev) => [...prev, deal]);
    setModalOpen(false);
  };

  const activeDeals = deals.filter((d) => d.stage !== "lost" && d.stage !== "sold");
  const totalLow = activeDeals.reduce((sum, d) => sum + (Number(d.estimated_value_low) || 0), 0);
  const totalHigh = activeDeals.reduce((sum, d) => sum + (Number(d.estimated_value_high) || 0), 0);
  const fmtM = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}m` : n > 0 ? `$${Math.round(n / 1000)}k` : null;
  const pipelineValue = fmtM(totalLow) && fmtM(totalHigh) && totalLow !== totalHigh
    ? `${fmtM(totalLow)}–${fmtM(totalHigh)}`
    : fmtM(totalHigh) || fmtM(totalLow);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Pipeline</h1>
          {pipelineValue && (
            <p className="text-sm text-slate-500 mt-0.5">
              Active pipeline: <span className="font-semibold text-slate-800">{pipelineValue}</span>
              <span className="ml-1.5 text-slate-400">· {activeDeals.length} deal{activeDeals.length !== 1 ? "s" : ""}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-slate-50"
          onClick={() => setModalOpen(true)}
        >
          + New deal
        </button>
      </div>

      {/* Key ensures PipelineBoard remounts when count changes */}
      <PipelineBoard key={deals.length} deals={deals} />

      <NewDealModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
