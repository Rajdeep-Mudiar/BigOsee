"use client";

import { useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconReset,
  IconStepBackward,
  IconStepForward,
  IconPlay,
  IconPause,
} from "./icons";
import { useTimelineStore } from "@/stores/timelineStore";
import { useCodeStore } from "@/stores/codeStore";
import { executeCode } from "@/engine/interpreter";
import { detectAlgorithm, detectByQuestionId } from "@/engine/detector";

export default function PlaybackControls() {
  const {
    currentStep,
    snapshots,
    isPlaying,
    speed,
    stepForward,
    stepBackward,
    togglePlay,
    setSpeed,
    setCurrentStep,
    setSnapshots,
  } = useTimelineStore();
  const { code, activeQuestionId, setDetectedAlgorithm } = useCodeStore();

  const totalSteps = snapshots.length;
  const progress = totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0;
  const pct = totalSteps > 0 ? Math.round(progress) : 0;
  const snapshot = snapshots[currentStep];

  const logs = useMemo(() => snapshot?.logs ?? [], [snapshot]);

  const handleRun = useCallback(() => {
    try {
      const algo = activeQuestionId
        ? detectByQuestionId(activeQuestionId) || detectAlgorithm(code)
        : detectAlgorithm(code);
      setDetectedAlgorithm(algo);

      const snaps = executeCode(code);
      if (snaps.length > 0) setSnapshots(snaps);
    } catch {
      // parse/runtime error
    }
  }, [code, activeQuestionId, setDetectedAlgorithm, setSnapshots]);

  // Auto-run + start playing when a question is selected
  const prevQuestionRef = useRef(activeQuestionId);
  const autoPlayTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    if (activeQuestionId && activeQuestionId !== prevQuestionRef.current) {
      prevQuestionRef.current = activeQuestionId;
      const t = setTimeout(() => {
        handleRun();
        // brief extra delay so snapshots settle before play starts
        // track this timeout so we can cancel it on cleanup
        if (autoPlayTimeoutRef.current !== null) {
          clearTimeout(autoPlayTimeoutRef.current);
        }
        autoPlayTimeoutRef.current = window.setTimeout(() => {
          // only start playback if it's not already playing to avoid accidental pauses
          if (!isPlaying) {
            togglePlay();
          }
        }, 200);
      }, 80);
      return () => {
        clearTimeout(t);
        if (autoPlayTimeoutRef.current !== null) {
          clearTimeout(autoPlayTimeoutRef.current);
          autoPlayTimeoutRef.current = null;
        }
      };
    }
  }, [activeQuestionId, handleRun, togglePlay, isPlaying]);

  // Auto-advance steps when playing
  useEffect(() => {
    if (!isPlaying) return;
    const ms = Math.max(80, 700 / speed);
    const id = setTimeout(stepForward, ms);
    return () => clearTimeout(id);
  }, [isPlaying, currentStep, speed, stepForward]);

  return (
    <div className="flex flex-col gap-3 shrink-0">
      <button
        onClick={handleRun}
        className="w-full py-2.5 text-sm font-semibold bg-accent text-black rounded-(--radius-panel) hover:bg-accent-hover active:scale-[0.98] transition-all"
      >
        Run Simulation
      </button>

      {/* Step counter + playback */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono">
          <span>Step</span>
          <span className="text-text-primary font-semibold">
            {totalSteps > 0 ? `${currentStep + 1}/${totalSteps}` : "0/0"}
          </span>
          <span className="text-text-muted ml-1">{pct}%</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentStep(0)}
            disabled={totalSteps === 0}
            className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
            title="Reset"
          >
            <IconReset size={14} />
          </button>

          <button
            onClick={stepBackward}
            disabled={currentStep <= 0}
            className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
            title="Step Backward"
          >
            <IconStepBackward size={14} />
          </button>

          <button
            onClick={togglePlay}
            disabled={totalSteps === 0}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all disabled:opacity-30 ${
              isPlaying
                ? "bg-accent text-black"
                : "bg-surface-hover text-text-primary hover:bg-accent hover:text-black"
            }`}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <IconPause size={13} /> : <IconPlay size={13} />}
          </button>

          <button
            onClick={stepForward}
            disabled={currentStep >= totalSteps - 1}
            className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
            title="Step Forward"
          >
            <IconStepForward size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-1 bg-border rounded-full overflow-hidden cursor-pointer"
        onClick={(e) => {
          if (totalSteps === 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const p = (e.clientX - rect.left) / rect.width;
          setCurrentStep(Math.round(p * (totalSteps - 1)));
        }}
      >
        <div
          className="h-full bg-accent rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Speed */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text-muted">Speed</span>
        <input
          type="range"
          min="0.25"
          max="4"
          step="0.25"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="flex-1 h-1 appearance-none bg-border rounded-full cursor-pointer accent-accent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
        />
        <span className="text-[10px] text-text-muted font-mono w-5 text-right">
          {speed}x
        </span>
      </div>

      {/* Step description + console logs */}
      {snapshot && (
        <div className="border border-accent/30 rounded-(--radius-panel) bg-accent/5 overflow-hidden">
          {/* animated description bar */}
          <div className="px-3 py-2 border-b border-accent/20 overflow-hidden relative">
            <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent rounded-l" />
            <AnimatePresence mode="wait">
              <motion.p
                key={snapshot.step}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="text-[11px] font-mono text-accent pl-2"
              >
                <span className="text-text-muted text-[10px]">
                  L{snapshot.line}{" "}
                </span>
                {snapshot.description}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* logs */}
          {logs.length > 0 && (
            <div className="px-3 py-2 space-y-0.5">
              {logs.slice(-3).map((log, i) => (
                <p
                  key={i}
                  className="text-[10px] font-mono text-green truncate"
                >
                  &gt; {log}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
