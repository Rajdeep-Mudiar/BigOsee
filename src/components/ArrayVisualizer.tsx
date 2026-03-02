"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ArrayState, ObjectState } from "@/engine/types";

/* ─── Array Card (default box view with indices) ─── */
export function ArrayCard({ arrays }: { arrays: ArrayState[] }) {
  return (
    <div className="flex flex-col h-full overflow-auto">
      {arrays.map((arr, ai) => (
        <div key={arr.name || ai} className="px-4 py-3">
          {arrays.length > 1 && (
            <span className="text-[10px] font-mono text-text-muted mb-2 block">
              {arr.name}
            </span>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            {arr.values.map((val, idx) => {
              const isH = arr.highlights.includes(idx);
              const isS = arr.swapped.includes(idx);
              const isDone = arr.sorted.includes(idx);

              let border = "border-border";
              let text = "text-text-primary";
              if (isDone) {
                border = "border-green";
                text = "text-green";
              }
              if (isH) {
                border = "border-accent";
                text = "text-accent";
              }
              if (isS) {
                border = "border-red";
                text = "text-red";
              }

              return (
                <motion.div
                  key={idx}
                  className={`w-10 h-10 flex flex-col items-center justify-center rounded-md border-2 font-mono text-sm font-medium bg-surface ${border} ${text}`}
                  initial={false}
                  animate={{ scale: isH || isS ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  {val}
                  <span className="text-[7px] text-text-muted">{idx}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Sorting Card (bar chart) ─── */
export function SortingCard({ arrays }: { arrays: ArrayState[] }) {
  const arr = arrays[0];
  const maxVal = Math.max(...arr.values, 1);
  const barW = Math.max(8, Math.min(40, Math.floor(280 / arr.values.length)));

  return (
    <div className="flex-1 flex items-end justify-center gap-1 px-4 pb-3 pt-2 h-full min-h-30">
      {arr.values.map((val, idx) => {
        const isH = arr.highlights.includes(idx);
        const isS = arr.swapped.includes(idx);
        const isDone = arr.sorted.includes(idx);

        let color = "bg-blue/60";
        if (isDone) color = "bg-green/70";
        if (isH) color = "bg-accent";
        if (isS) color = "bg-red";

        return (
          <motion.div
            key={idx}
            className={`${color} rounded-t-sm relative`}
            style={{ width: barW }}
            initial={false}
            animate={{
              height: `${Math.max((val / maxVal) * 100, 4)}%`,
              scale: isH || isS ? 1.05 : 1,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-text-muted whitespace-nowrap">
              {val}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Stack Card (vertical LIFO) ─── */
export function StackCard({ arrays }: { arrays: ArrayState[] }) {
  const arr = arrays[0];
  const reversed = useMemo(() => [...arr.values].reverse(), [arr.values]);

  return (
    <div className="flex flex-col items-center justify-end h-full px-4 py-3 gap-1 overflow-auto">
      <span className="text-[9px] text-text-muted font-mono mb-1">← top</span>
      <AnimatePresence mode="popLayout">
        {reversed.map((val, i) => {
          const origIdx = arr.values.length - 1 - i;
          const isH = arr.highlights.includes(origIdx);
          const isS = arr.swapped.includes(origIdx);
          const isTop = i === 0;

          let bg = "bg-surface border-border text-text-primary";
          if (isTop) bg = "bg-accent/10 border-accent text-accent";
          if (isH) bg = "bg-accent/20 border-accent text-accent";
          if (isS) bg = "bg-red/20 border-red text-red";

          return (
            <motion.div
              key={`${origIdx}-${val}`}
              className={`w-24 h-8 flex items-center justify-center rounded-md border-2 font-mono text-sm font-medium ${bg}`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {val}
            </motion.div>
          );
        })}
      </AnimatePresence>
      <div className="w-28 h-0.5 bg-border mt-1" />
      <span className="text-[9px] text-text-muted font-mono">bottom →</span>
    </div>
  );
}

/* ─── HashMap Card (key-value pills) ─── */
export function HashMapCard({ objects }: { objects: ObjectState[] }) {
  return (
    <div className="h-full overflow-auto">
      {objects.map((obj, oi) => (
        <div key={obj.name || oi} className="px-4 py-3">
          <span className="text-[10px] font-mono text-green font-semibold mb-2 block">
            {obj.name}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {obj.entries.map((e) => (
              <div
                key={e.key}
                className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1.5 rounded-md border ${
                  e.changed
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surface text-text-secondary"
                }`}
              >
                <span className="font-semibold">{e.key}</span>
                <span className="text-text-muted">:</span>
                <span>{fmtVal(e.value)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── DP Card (table/grid) ─── */
export function DPCard({ arrays }: { arrays: ArrayState[] }) {
  return (
    <div className="h-full overflow-auto px-4 py-3">
      {arrays.map((arr, ai) => (
        <div key={arr.name || ai} className={ai > 0 ? "mt-3" : ""}>
          {arrays.length > 1 && (
            <span className="text-[10px] font-mono text-text-muted mb-1 block">
              {arr.name}
            </span>
          )}
          <div className="flex items-center gap-px flex-wrap">
            {arr.values.map((val, idx) => {
              const isH = arr.highlights.includes(idx);
              const isS = arr.swapped.includes(idx);
              const isDone = arr.sorted.includes(idx);

              let bg = "bg-surface border-border";
              if (isDone) bg = "bg-green/10 border-green";
              if (isH) bg = "bg-accent/20 border-accent";
              if (isS) bg = "bg-red/20 border-red";

              return (
                <div
                  key={idx}
                  className={`w-9 h-9 flex flex-col items-center justify-center border font-mono text-xs ${bg}`}
                >
                  <span className="font-medium">{val}</span>
                  <span className="text-[7px] text-text-muted">{idx}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Tree Card (level-by-level binary tree) ─── */
export function TreeCard({ arrays }: { arrays: ArrayState[] }) {
  const arr = arrays[0];
  const levels = useMemo(() => {
    const lvls: { val: number; idx: number }[][] = [];
    let start = 0;
    let size = 1;
    while (start < arr.values.length) {
      const level: { val: number; idx: number }[] = [];
      for (let i = start; i < Math.min(start + size, arr.values.length); i++) {
        level.push({ val: arr.values[i], idx: i });
      }
      lvls.push(level);
      start += size;
      size *= 2;
    }
    return lvls;
  }, [arr.values]);

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-3 h-full overflow-auto">
      {levels.map((level, li) => (
        <div
          key={li}
          className="flex items-center justify-center"
          style={{ gap: `${Math.max(4, 48 / (li + 1))}px` }}
        >
          {level.map(({ val, idx }) => {
            const isH = arr.highlights.includes(idx);
            const isS = arr.swapped.includes(idx);
            const isDone = arr.sorted.includes(idx);

            let s = "border-border bg-surface text-text-primary";
            if (isDone) s = "border-green bg-green/10 text-green";
            if (isH) s = "border-accent bg-accent/10 text-accent";
            if (isS) s = "border-red bg-red/10 text-red";

            return (
              <motion.div
                key={idx}
                className={`w-9 h-9 flex items-center justify-center rounded-full border-2 font-mono text-sm font-medium ${s}`}
                initial={false}
                animate={{ scale: isH || isS ? 1.15 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {val}
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ─── Graph Card (circular layout) ─── */
export function GraphCard({ arrays }: { arrays: ArrayState[] }) {
  const arr = arrays[0];
  const n = arr.values.length;
  const radius = Math.min(80, 20 + n * 8);

  return (
    <div className="flex items-center justify-center h-full py-4">
      <div
        className="relative"
        style={{ width: radius * 2 + 60, height: radius * 2 + 60 }}
      >
        {arr.values.map((val, idx) => {
          const angle = (2 * Math.PI * idx) / n - Math.PI / 2;
          const cx = radius + 30 + Math.cos(angle) * radius;
          const cy = radius + 30 + Math.sin(angle) * radius;

          const isH = arr.highlights.includes(idx);
          const isS = arr.swapped.includes(idx);
          const isDone = arr.sorted.includes(idx);

          let s = "border-border bg-surface text-text-primary";
          if (isDone) s = "border-green bg-green/10 text-green";
          if (isH) s = "border-accent bg-accent/10 text-accent";
          if (isS) s = "border-red bg-red/10 text-red";

          return (
            <motion.div
              key={idx}
              className={`absolute w-8 h-8 flex items-center justify-center rounded-full border-2 font-mono text-xs font-medium ${s}`}
              style={{ left: cx - 16, top: cy - 16 }}
              initial={false}
              animate={{ scale: isH || isS ? 1.2 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {val}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function fmtVal(v: unknown): string {
  if (v === undefined) return "—";
  if (v === null) return "null";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v.length > 10 ? v.slice(0, 10) + "…" : v;
  return "…";
}
