"use client";

import { useCodeStore } from "@/stores/codeStore";
import { IconFocus, IconInsight } from "./icons";

export default function AlgorithmInfo() {
  const { detectedAlgorithm } = useCodeStore();

  return (
    <div className="shrink-0 border border-border rounded-(--radius-panel) bg-surface overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            {detectedAlgorithm?.name || "Algorithm Visualizer"}
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            {detectedAlgorithm?.description ||
              "Write or paste code, then run simulation"}
          </p>
        </div>
        {detectedAlgorithm && (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-sm bg-green/20 text-green border border-green/30 uppercase">
            {detectedAlgorithm.category}
          </span>
        )}
      </div>

      <div className="flex border-t border-border">
        <div className="flex-1 flex items-start gap-2.5 px-4 py-3 border-r border-border">
          <IconFocus size={18} className="mt-0.5 shrink-0" />
          <div>
            <h4 className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">
              Focus
            </h4>
            <p className="text-xs text-text-primary mt-0.5">
              {detectedAlgorithm
                ? `${detectedAlgorithm.timeComplexity.average} time`
                : "—"}
            </p>
          </div>
        </div>
        <div className="flex-1 flex items-start gap-2.5 px-4 py-3">
          <IconInsight size={18} className="mt-0.5 shrink-0" />
          <div>
            <h4 className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">
              Insight
            </h4>
            <p className="text-xs text-text-primary mt-0.5">
              {detectedAlgorithm
                ? `${detectedAlgorithm.spaceComplexity} space`
                : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
