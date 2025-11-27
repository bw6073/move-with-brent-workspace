// src/components/properties/PropertySideTabs.tsx
"use client";

import React, { useState } from "react";
import { PropertyAppraisalsPanel } from "./PropertyAppraisalsPanel";
import { PropertyContactsPanel } from "./PropertyContactsPanel";
import { PropertyTasksPanel } from "./PropertyTasksPanel";
import { PropertyTimelinePanel } from "./PropertyTimelinePanel";

type Props = {
  propertyId: number;
};

const TABS = ["Timeline", "Appraisals", "Contacts", "Tasks", "Files"] as const;
type TabKey = (typeof TABS)[number];

export function PropertySideTabs({ propertyId }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("Timeline");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-sm">
      {/* Tab buttons */}
      <div className="mb-3 flex flex-wrap gap-1">
        {TABS.map((tab) => {
          const selected = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={
                "rounded-full px-3 py-1 text-xs font-medium " +
                (selected
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200")
              }
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div className="border-t border-slate-100 pt-3 text-xs text-slate-600">
        {activeTab === "Timeline" && (
          <PropertyTimelinePanel propertyId={propertyId} />
        )}

        {activeTab === "Appraisals" && (
          <PropertyAppraisalsPanel propertyId={propertyId} />
        )}

        {activeTab === "Contacts" && (
          <PropertyContactsPanel propertyId={propertyId} />
        )}

        {activeTab === "Tasks" && (
          <PropertyTasksPanel propertyId={propertyId} />
        )}

        {activeTab === "Files" && (
          <p className="text-xs text-slate-500">
            Later we can surface photo folders, floorplans, strata docs, and
            other files for this property in this tab.
          </p>
        )}
      </div>
    </div>
  );
}
