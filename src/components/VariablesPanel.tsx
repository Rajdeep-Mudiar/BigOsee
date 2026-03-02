"use client";

import { useTimelineStore } from "@/stores/timelineStore";
import { GripVertical } from "lucide-react";

export default function VariablesPanel() {
  const { snapshots, currentStep, totalComparisons, totalSwaps } =
    useTimelineStore();

  const snapshot = snapshots[currentStep];

  return (
    <div className="flex gap-3 shrink-0">
      {/* Variables */}
      <div className="flex-1 rounded-(--radius-panel) border border-border bg-surface overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border">
          <GripVertical size={10} className="text-text-muted cursor-grab" />
          <span className="text-[10px] font-semibold tracking-widest text-text-muted uppercase">
            Variables
          </span>
        </div>
        <div className="px-3 py-2 min-h-15 max-h-30 overflow-y-auto">
          {snapshot && snapshot.variables.length > 0 ? (
            <div className="space-y-1">
              {snapshot.variables.map((v) => (
                <div
                  key={v.name}
                  className="flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-text-secondary">{v.name}</span>
                    <span className="text-[9px] text-blue px-1 py-px bg-blue/10 rounded">
                      {v.type}
                    </span>
                  </div>
                  <span
                    className={
                      v.changed
                        ? "text-accent font-medium"
                        : "text-text-primary"
                    }
                  >
                    {JSON.stringify(v.value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-text-muted">No variables</span>
          )}
        </div>
      </div>

      {/* Call Stack */}
      <div className="flex-1 rounded-(--radius-panel) border border-border bg-surface overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border">
          <GripVertical size={10} className="text-text-muted cursor-grab" />
          <span className="text-[10px] font-semibold tracking-widest text-text-muted uppercase">
            Call Stack
          </span>
        </div>
        <div className="px-3 py-2 space-y-1.5 min-h-15">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="text-text-primary">comparisons</span>
            </div>
            <span className="text-accent font-medium">{totalComparisons}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red" />
              <span className="text-text-primary">swaps</span>
            </div>
            <span className="text-red font-medium">{totalSwaps}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
