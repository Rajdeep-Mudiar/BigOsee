"use client";

import { useTimelineStore } from "@/stores/timelineStore";
import { Terminal } from "lucide-react";

export default function ExecutionLog() {
  const { snapshots, currentStep } = useTimelineStore();

  const start = Math.max(0, currentStep - 4);
  const recentSteps = snapshots.slice(start, currentStep + 1);

  return (
    <div className="rounded-(--radius-panel) border border-border bg-surface overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border">
        <Terminal size={11} className="text-text-muted" />
        <span className="text-[10px] font-semibold tracking-widest text-text-muted uppercase">
          Execution Log
        </span>
      </div>
      <div className="px-3 py-2 max-h-20 overflow-y-auto font-mono text-[11px] leading-4.5">
        {recentSteps.length === 0 ? (
          <span className="text-text-muted">Run to begin.</span>
        ) : (
          recentSteps.map((snap, i) => (
            <div
              key={snap.step}
              className={`flex gap-2 ${
                i === recentSteps.length - 1 ? "text-accent" : "text-text-muted"
              }`}
            >
              <span className="shrink-0">→</span>
              <span className="truncate">
                L{snap.line} {snap.description}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
