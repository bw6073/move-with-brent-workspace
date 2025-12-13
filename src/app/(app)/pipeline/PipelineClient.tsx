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

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Pipeline</h1>
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
