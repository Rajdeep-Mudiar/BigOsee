"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ArrayState, ObjectState, VariableState } from "@/engine/types";

/* ─── Pointer visualization helpers ─── */

// Common loop/search variable names that hold array indices
const POINTER_NAMES = new Set([
  "i",
  "j",
  "k",
  "l",
  "r",
  "p",
  "q",
  "left",
  "right",
  "low",
  "high",
  "mid",
  "start",
  "end",
  "slow",
  "fast",
  "tortoise",
  "hare",
  "idx",
  "pos",
  "minIdx",
  "maxIdx",
  "pivot",
  "top",
]);

// Cycling colour palette for up to 6 distinct pointers
const PTR_COLORS = [
  {
    badge: "border-amber-400 bg-amber-400/25 text-amber-300",
    dot: "bg-amber-400",
  },
  { badge: "border-sky-400 bg-sky-400/25 text-sky-300", dot: "bg-sky-400" },
  {
    badge: "border-emerald-400 bg-emerald-400/25 text-emerald-300",
    dot: "bg-emerald-400",
  },
  { badge: "border-rose-400 bg-rose-400/25 text-rose-300", dot: "bg-rose-400" },
  {
    badge: "border-violet-400 bg-violet-400/25 text-violet-300",
    dot: "bg-violet-400",
  },
  {
    badge: "border-fuchsia-400 bg-fuchsia-400/25 text-fuchsia-300",
    dot: "bg-fuchsia-400",
  },
];

function buildPointerMap(
  vars: VariableState[],
  arrLen: number,
): Map<number, { name: string; ci: number }[]> {
  const map = new Map<number, { name: string; ci: number }[]>();
  let ci = 0;
  for (const v of vars) {
    if (
      typeof v.value !== "number" ||
      !Number.isInteger(v.value) ||
      v.value < 0 ||
      v.value >= arrLen
    )
      continue;
    if (!POINTER_NAMES.has(v.name)) continue;
    if (!map.has(v.value as number)) map.set(v.value as number, []);
    map
      .get(v.value as number)!
      .push({ name: v.name, ci: ci++ % PTR_COLORS.length });
  }
  return map;
}

/* ─── Array Card (default box view with indices + pointer arrows) ─── */
export function ArrayCard({
  arrays,
  variables = [],
}: {
  arrays: ArrayState[];
  variables?: VariableState[];
}) {
  return (
    <div className="flex flex-col h-full overflow-auto">
      {arrays.map((arr, ai) => {
        const ptrMap = buildPointerMap(variables, arr.values.length);
        return (
          <div key={arr.name || ai} className="px-4 pt-2 pb-3">
            {arrays.length > 1 && (
              <span className="text-[10px] font-mono text-text-muted mb-1 block">
                {arr.name}
              </span>
            )}
            {/* legend row */}
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center gap-1 text-[9px] text-text-muted">
                <span className="w-2 h-2 rounded-sm bg-accent inline-block" />{" "}
                comparing
              </span>
              <span className="flex items-center gap-1 text-[9px] text-text-muted">
                <span className="w-2 h-2 rounded-sm bg-red inline-block" />{" "}
                swapped
              </span>
              <span className="flex items-center gap-1 text-[9px] text-text-muted">
                <span className="w-2 h-2 rounded-sm bg-green inline-block" />{" "}
                done
              </span>
            </div>
            <div className="flex items-end gap-1.5 flex-wrap">
              {arr.values.map((val, idx) => {
                const isH = arr.highlights.includes(idx);
                const isS = arr.swapped.includes(idx);
                const isDone = arr.sorted.includes(idx);
                const ptrs = ptrMap.get(idx) ?? [];

                let border = "border-border";
                let text = "text-text-primary";
                let cellBg = "bg-surface";
                if (isDone) {
                  border = "border-green";
                  text = "text-green";
                  cellBg = "bg-green/5";
                }
                if (isH) {
                  border = "border-accent";
                  text = "text-accent";
                  cellBg = "bg-accent/10";
                }
                if (isS) {
                  border = "border-red";
                  text = "text-red";
                  cellBg = "bg-red/10";
                }

                return (
                  <div key={idx} className="flex flex-col items-center gap-0">
                    {/* pointer badge area — always 36px tall so cells align */}
                    <div className="h-9 flex flex-col items-center justify-end gap-0.5 pb-0.5">
                      <AnimatePresence>
                        {ptrs.map((ptr) => (
                          <motion.span
                            key={ptr.name}
                            initial={{ opacity: 0, y: -8, scale: 0.7 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 28,
                            }}
                            className={`text-[8px] font-bold leading-none px-1 py-px rounded border ${PTR_COLORS[ptr.ci].badge}`}
                          >
                            {ptr.name}
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </div>
                    {/* connector line */}
                    <div className="h-2">
                      {ptrs.length > 0 && (
                        <motion.div
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          className={`w-0.5 h-full ${PTR_COLORS[ptrs[0].ci].dot} rounded-full`}
                        />
                      )}
                    </div>
                    {/* cell */}
                    <motion.div
                      className={`w-10 h-10 flex flex-col items-center justify-center rounded-md border-2 font-mono text-sm font-medium ${cellBg} ${border} ${text}`}
                      initial={false}
                      animate={{
                        scale: isS ? 1.2 : isH ? 1.1 : 1,
                        rotate: isS ? [0, -4, 4, 0] : 0,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 20,
                      }}
                    >
                      {val}
                      <span className="text-[7px] text-text-muted">{idx}</span>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SortingCard — reference-site style bar-chart
 *
 * Visual design:
 *   • Bars proportional to value (bigger number → taller bar)
 *   • Gradient fills: blue (default) / yellow (comparing) / red (swapping) / green (sorted)
 *   • Value label centered inside bar (or above if bar is too short)
 *   • Index label below each bar in a fixed footer row
 *   • Pointer badges (i, j, left, right …) shown above bars with colored pins
 *   • Horizontal baseline rule at the bottom of the chart
 *   • Legend row at top
 *
 * Animation:
 *   • FLIP-style `left` spring whenever exactly two values exchange position
 *   • Bars lift slightly (y: -12) and glow red while being swapped
 *   • Uses prevValsRef diffing — works correctly for forward AND backward steps
 * ─────────────────────────────────────────────────────────────────────────── */

// Gradient stop pairs per state
const BAR_GRADIENTS = {
  default: ["#60a5fa", "#2563eb"], // blue
  sorted: ["#4ade80", "#16a34a"], // green
  compare: ["#fde68a", "#f59e0b"], // amber/yellow
  swap: ["#fca5a5", "#dc2626"], // red
} as const;

function barGradient(id: string, top: string, bot: string) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={top} />
        <stop offset="100%" stopColor={bot} />
      </linearGradient>
    </defs>
  );
}
// silence unused — we use inline style gradients instead
void barGradient;

export function SortingCard({
  arrays,
  variables = [],
}: {
  arrays: ArrayState[];
  variables?: VariableState[];
}) {
  const arr = arrays[0];
  const n = arr.values.length;

  /* ── Bar identity: value-matching positional derivation ──────────────────
   *
   * barValues[id] = the value this bar represents — set ONCE at reset time
   *   (first render or when n changes) and NEVER changed.
   *   Heights and labels are derived from this forever.
   *
   * positionOf[id] = where bar `id` currently lives, rebuilt FRESH every
   *   render by matching arr.values against barValues. This means:
   *   - No cumulative mutation problems.
   *   - Works perfectly for forward AND backward stepping.
   *   - Works across all 3 sub-steps of a tmp-swap (no diff needed).
   *
   * Duplicate-safe algorithm:
   *   1. First assign bars whose value sits at the same index (unchanged).
   *   2. Then place remaining bars in the first unclaimed slot with their value.
   *   3. Any bar whose value is in a temp variable (missing from arr.values)
   *      gets the first unclaimed position so Framer can still render it.
   * ───────────────────────────────────────────────────────────────────────── */
  const barValues = useRef<number[]>([]);
  const barSigRef = useRef<string>("");

  // Reset whenever n changes OR the sorted signature changes (new question with same n)
  const curSig = [...arr.values].sort((a, b) => a - b).join(",");
  if (barValues.current.length !== n || curSig !== barSigRef.current) {
    barValues.current = [...arr.values];
    barSigRef.current = curSig;
  }

  const maxBarVal = Math.max(...barValues.current, 1);

  // Rebuild positionOf fresh from current arr.values
  const positionOf = new Array<number>(n).fill(-1);
  const claimedPos = new Set<number>();

  // Pass 1: bars that haven't moved (value at same index)
  for (let id = 0; id < n; id++) {
    if (arr.values[id] === barValues.current[id]) {
      positionOf[id] = id;
      claimedPos.add(id);
    }
  }
  // Pass 2: displaced bars — find their value in any unclaimed position
  for (let id = 0; id < n; id++) {
    if (positionOf[id] !== -1) continue;
    for (let pos = 0; pos < n; pos++) {
      if (!claimedPos.has(pos) && arr.values[pos] === barValues.current[id]) {
        positionOf[id] = pos;
        claimedPos.add(pos);
        break;
      }
    }
  }
  // Pass 3: bars in temp var (value absent from arr.values mid-swap) — park at any free slot
  for (let id = 0; id < n; id++) {
    if (positionOf[id] !== -1) continue;
    for (let pos = 0; pos < n; pos++) {
      if (!claimedPos.has(pos)) {
        positionOf[id] = pos;
        claimedPos.add(pos);
        break;
      }
    }
  }

  /* ── geometry — responsive to container ── */
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 480, h: 240 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) =>
      setDims({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const LEGEND_H = 24; // top legend row
  const PTR_H = 28; // pointer badge zone above bars
  const IDX_H = 20; // index label row below bars
  const BASE_H = 2; // baseline stroke
  const CHART_H = Math.max(60, dims.h - LEGEND_H - PTR_H - IDX_H - BASE_H - 12);

  const GAP = Math.max(2, Math.min(6, Math.floor((dims.w * 0.08) / n)));
  const BAR_W = Math.max(
    8,
    Math.min(52, Math.floor((dims.w - 32 - GAP * (n - 1)) / n)),
  );
  const totalW = n * BAR_W + (n - 1) * GAP;

  const ptrMap = buildPointerMap(variables, n);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col select-none"
      style={{ minHeight: 140 }}
    >
      {/* ── Legend ───────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 shrink-0"
        style={{ height: LEGEND_H }}
      >
        {[
          { color: "#3b82f6", label: "unsorted" },
          { color: "#f59e0b", label: "comparing" },
          { color: "#dc2626", label: "swapping" },
          { color: "#16a34a", label: "sorted" },
        ].map(({ color, label }) => (
          <span
            key={label}
            className="flex items-center gap-1 text-[9px] text-text-muted font-mono"
          >
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ background: color }}
            />
            {label}
          </span>
        ))}
      </div>

      {/* ── Chart area ───────────────────────────────────────────────────── */}
      <div
        className="flex-1 flex items-end justify-center px-4 pb-1"
        style={{ minHeight: 0 }}
      >
        <div
          className="relative flex-shrink-0"
          style={{ width: totalW, height: PTR_H + CHART_H + IDX_H + BASE_H }}
        >
          {Array.from({ length: n }, (_, id) => {
            const pos = positionOf[id] ?? id;
            const isH = arr.highlights.includes(pos);
            const isS = arr.swapped.includes(pos);
            const isDone = arr.sorted.includes(pos);
            const ptrs = ptrMap.get(pos) ?? [];

            // ── Bar's FIXED value and height (never changes, regardless of position) ──
            // Use barValues[id] — the value this bar was born with — so the bar
            // carries its correct height as it slides to any column during a swap.
            const barVal = barValues.current[id] ?? arr.values[pos];
            const barH = Math.max(
              Math.round((barVal / maxBarVal) * CHART_H),
              6,
            );

            // ── TRANSFORM-based swap animation ────────────────────────────
            // Each bar is pinned to its IDENTITY position (id × step) via CSS
            // `left` (never changes → no layout thrash).  The visual offset is
            // carried by an `x` transform so Framer Motion can spring it cheaply
            // on the GPU.  When stabIds swaps two entries, `pos` changes for
            // those two ids → `xOffset` changes → Framer springs to new slot.
            const homeLeft = id * (BAR_W + GAP); // fixed CSS left — identity home
            const targLeft = pos * (BAR_W + GAP); // visual target column
            const xOffset = targLeft - homeLeft; // GPU-animated transform offset

            /* gradient pair */
            const [gradTop, gradBot] = isS
              ? BAR_GRADIENTS.swap
              : isH
                ? BAR_GRADIENTS.compare
                : isDone
                  ? BAR_GRADIENTS.sorted
                  : BAR_GRADIENTS.default;

            const glowColor = isS
              ? "rgba(220,38,38,0.7)"
              : isH
                ? "rgba(245,158,11,0.6)"
                : "transparent";

            /* font size scales with bar width */
            const valFontSz = Math.max(8, Math.min(13, BAR_W - 4));

            /* show value inside bar if tall enough, else just above */
            const valInsideBar = barH > valFontSz + 10;

            return (
              <motion.div
                key={id}
                className="absolute flex flex-col items-center"
                style={{ width: BAR_W, bottom: IDX_H + BASE_H, left: homeLeft }}
                /* x animates the SLIDE — height is fixed and never re-animates */
                initial={{ x: xOffset }}
                animate={{ x: xOffset }}
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 26, mass: 0.8 },
                }}
              >
                {/* ── Pointer badges + pin ── */}
                <div
                  className="absolute flex flex-col items-center gap-0.5"
                  style={{
                    bottom: barH + (valInsideBar ? 2 : valFontSz + 6),
                    width: "100%",
                  }}
                >
                  <AnimatePresence>
                    {ptrs.map((ptr) => (
                      <motion.span
                        key={ptr.name}
                        initial={{ opacity: 0, y: -6, scale: 0.7 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 28,
                        }}
                        className={`text-[7px] font-bold leading-none px-0.5 py-px rounded border whitespace-nowrap ${PTR_COLORS[ptr.ci].badge}`}
                      >
                        {ptr.name}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                  {ptrs.length > 0 && (
                    <div
                      className={`w-px h-2.5 rounded-full ${PTR_COLORS[ptrs[0].ci].dot}`}
                    />
                  )}
                </div>

                {/* ── Value label above bar (when bar is short) ── */}
                {!valInsideBar && (
                  <div
                    className="absolute font-mono font-bold text-text-primary whitespace-nowrap"
                    style={{
                      fontSize: valFontSz,
                      lineHeight: 1,
                      bottom: barH + 3,
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}
                  >
                    {barVal}
                  </div>
                )}

                {/* ── The bar column ──────────────────────────────────────────
                 * height is set via `style` only — NOT animated — so it never
                 * changes after mount.  Only colour (via gradient) and lift (y)
                 * are animated, keeping the bar's proportions locked to barVal.
                 * ──────────────────────────────────────────────────────────── */}
                <motion.div
                  className="absolute bottom-0 w-full rounded-t"
                  animate={{ y: isS ? -12 : 0 }}
                  transition={{
                    y: { type: "spring", stiffness: 300, damping: 20 },
                  }}
                  style={{
                    height: barH, // fixed — no animation on height
                    background: `linear-gradient(to bottom, ${gradTop}, ${gradBot})`,
                    boxShadow:
                      isS || isH
                        ? `0 0 18px 5px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.25)`
                        : "inset 0 1px 0 rgba(255,255,255,0.15)",
                    border: `1px solid ${gradBot}88`,
                    transformOrigin: "bottom center",
                  }}
                >
                  {/* Value label inside bar (near top) */}
                  {valInsideBar && (
                    <div
                      className="absolute w-full text-center font-mono font-bold text-white/95 leading-none"
                      style={{ fontSize: valFontSz, top: 5 }}
                    >
                      {barVal}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            );
          })}

          {/* ── Index labels row ── */}
          <div
            className="absolute left-0 right-0 flex"
            style={{ bottom: 0, height: IDX_H + BASE_H }}
          >
            {/* baseline */}
            <div
              className="absolute left-0 right-0 bg-border"
              style={{ top: 0, height: BASE_H }}
            />
            {/* index numbers */}
            {Array.from({ length: n }, (_, pos) => {
              const leftPx = pos * (BAR_W + GAP);
              const idxFontSz = Math.max(7, Math.min(11, BAR_W - 3));
              return (
                <div
                  key={pos}
                  className="absolute flex items-center justify-center font-mono text-text-muted"
                  style={{
                    left: leftPx,
                    width: BAR_W,
                    top: BASE_H + 2,
                    height: IDX_H - 2,
                    fontSize: idxFontSz,
                  }}
                >
                  {pos}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Stack Card (vertical LIFO) ─── */
export function StackCard({
  arrays,
  variables: _v = [],
}: {
  arrays: ArrayState[];
  variables?: VariableState[];
}) {
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

/* ─── HashMap Card (key-value pills with animated entries) ─── */
export function HashMapCard({ objects }: { objects: ObjectState[] }) {
  return (
    <div className="h-full overflow-auto">
      {objects.map((obj, oi) => (
        <div key={obj.name || oi} className="px-4 py-3">
          <span className="text-[10px] font-mono text-green font-semibold mb-2 block">
            {obj.name}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <AnimatePresence mode="popLayout">
              {obj.entries.map((e) => (
                <motion.div
                  key={e.key}
                  layout
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{
                    opacity: 1,
                    scale: e.changed ? [1, 1.12, 1] : 1,
                  }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1.5 rounded-md border ${
                    e.changed
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border bg-surface text-text-secondary"
                  }`}
                >
                  <span className="font-semibold">{e.key}</span>
                  <span className="text-text-muted">:</span>
                  <span>{fmtVal(e.value)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── DP Card (table/grid with pointer indicators) ─── */
export function DPCard({
  arrays,
  variables = [],
}: {
  arrays: ArrayState[];
  variables?: VariableState[];
}) {
  return (
    <div className="h-full overflow-auto px-4 py-3">
      {arrays.map((arr, ai) => {
        const ptrMap = buildPointerMap(variables, arr.values.length);
        return (
          <div key={arr.name || ai} className={ai > 0 ? "mt-4" : ""}>
            {arrays.length > 1 && (
              <span className="text-[10px] font-mono text-text-muted mb-1 block">
                {arr.name}
              </span>
            )}
            <div className="flex items-end gap-px flex-wrap">
              {arr.values.map((val, idx) => {
                const isH = arr.highlights.includes(idx);
                const isS = arr.swapped.includes(idx);
                const isDone = arr.sorted.includes(idx);
                const ptrs = ptrMap.get(idx) ?? [];

                let bg = "bg-surface border-border text-text-primary";
                if (isDone) bg = "bg-green/10 border-green text-green";
                if (isH) bg = "bg-accent/20 border-accent text-accent";
                if (isS) bg = "bg-red/20 border-red text-red";

                return (
                  <div key={idx} className="flex flex-col items-center">
                    {/* pointer badges */}
                    <div className="h-6 flex flex-col items-center justify-end gap-0.5">
                      <AnimatePresence>
                        {ptrs.map((ptr) => (
                          <motion.span
                            key={ptr.name}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`text-[7px] font-bold leading-none px-0.5 rounded border ${PTR_COLORS[ptr.ci].badge}`}
                          >
                            {ptr.name}
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </div>
                    <motion.div
                      className={`w-9 h-9 flex flex-col items-center justify-center border font-mono text-xs ${bg}`}
                      animate={{ scale: isH || isS ? 1.1 : 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 20,
                      }}
                    >
                      <span className="font-medium">
                        {val === Infinity || val === 999 ? "∞" : val}
                      </span>
                      <span className="text-[7px] text-text-muted">{idx}</span>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Tree Card (level-by-level binary tree) ─── */
export function TreeCard({
  arrays,
  variables: _v = [],
}: {
  arrays: ArrayState[];
  variables?: VariableState[];
}) {
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
export function GraphCard({
  arrays,
  variables: _v = [],
}: {
  arrays: ArrayState[];
  variables?: VariableState[];
}) {
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
