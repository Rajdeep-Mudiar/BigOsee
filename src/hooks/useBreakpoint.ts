"use client";

import { useState, useEffect } from "react";

type Breakpoint = "mobile" | "tablet" | "desktop";

interface BreakpointState {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** false during SSR / before first client paint — use to avoid hydration mismatch */
  mounted: boolean;
}

// Tailwind v4 standard breakpoints
const SM = 640;
const LG = 1024;

function getBreakpoint(width: number): Breakpoint {
  if (width < SM) return "mobile";
  if (width < LG) return "tablet";
  return "desktop";
}

/**
 * SSR-safe hook that tracks viewport breakpoint using matchMedia.
 * Returns { breakpoint, isMobile, isTablet, isDesktop, mounted }.
 *
 * Breakpoints:
 *   mobile  — < 640px
 *   tablet  — 640px–1023px
 *   desktop — >= 1024px
 *
 * During SSR the hook defaults to "desktop". The `mounted` flag is
 * `false` until the first client-side paint, so consumers can gate
 * layout-switching logic behind `mounted` to avoid hydration mismatches.
 */
export function useBreakpoint(): BreakpointState {
  const [bp, setBp] = useState<Breakpoint>("desktop"); // SSR default
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Set initial value from actual window width
    setBp(getBreakpoint(window.innerWidth));
    setMounted(true);

    const mqSm = window.matchMedia(`(min-width: ${SM}px)`);
    const mqLg = window.matchMedia(`(min-width: ${LG}px)`);

    const update = () => {
      if (mqLg.matches) setBp("desktop");
      else if (mqSm.matches) setBp("tablet");
      else setBp("mobile");
    };

    mqSm.addEventListener("change", update);
    mqLg.addEventListener("change", update);

    return () => {
      mqSm.removeEventListener("change", update);
      mqLg.removeEventListener("change", update);
    };
  }, []);

  return {
    breakpoint: bp,
    isMobile: bp === "mobile",
    isTablet: bp === "tablet",
    isDesktop: bp === "desktop",
    mounted,
  };
}
