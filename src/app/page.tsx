"use client";

import { useEffect, useRef } from "react";
import { useTimelineStore } from "@/stores/timelineStore";
import { useUIStore } from "@/stores/uiStore";
import { useCodeStore } from "@/stores/codeStore";
import dynamic from "next/dynamic";
import { Panel, Group, Separator } from "react-resizable-panels";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import AlgorithmInfo from "@/components/AlgorithmInfo";
import PlaybackControls from "@/components/PlaybackControls";
import { useBreakpoint } from "@/hooks/useBreakpoint";

const EditorPanel = dynamic(() => import("@/components/EditorPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center rounded-(--radius-panel) border border-border bg-surface min-h-75 lg:min-h-0">
      <span className="text-text-muted text-sm animate-pulse">
        Loading editor...
      </span>
    </div>
  ),
});

const VisualizationGrid = dynamic(
  () => import("@/components/VisualizationGrid"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center min-h-50">
        <span className="text-text-muted text-sm animate-pulse">
          Loading panels...
        </span>
      </div>
    ),
  },
);

function ResizeHandle() {
  return (
    <Separator className="group relative flex items-center justify-center w-1.5 cursor-col-resize">
      <div className="w-px h-full bg-border  group-hover:bg-accent group-active:bg-accent transition-colors" />
    </Separator>
  );
}

/** Code / Visualize tab switcher for mobile & tablet */
function MobileTabBar() {
  const mobileTab = useUIStore((s) => s.mobileTab);
  const setMobileTab = useUIStore((s) => s.setMobileTab);
  const hasData = useTimelineStore((s) => s.snapshots.length > 0);

  return (
    <div className="flex mx-2 sm:mx-3 mt-2 sm:mt-3 p-0.5 bg-surface rounded-(--radius-panel) border border-border shrink-0">
      <button
        onClick={() => setMobileTab("code")}
        className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
          mobileTab === "code"
            ? "bg-accent text-black"
            : "text-text-secondary hover:text-text-primary"
        }`}
      >
        Code
      </button>
      <button
        onClick={() => setMobileTab("visualize")}
        className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors relative ${
          mobileTab === "visualize"
            ? "bg-accent text-black"
            : "text-text-secondary hover:text-text-primary"
        }`}
      >
        Visualize
        {/* Green dot indicator when data is available but user is on Code tab */}
        {hasData && mobileTab === "code" && (
          <span className="absolute top-1 right-2 w-1.5 h-1.5 bg-green rounded-full" />
        )}
      </button>
    </div>
  );
}

export default function Home() {
  const { isPlaying, speed, stepForward } = useTimelineStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { isDesktop, mounted } = useBreakpoint();

  // Until mounted, treat as desktop to match SSR default and avoid hydration mismatch.
  // After mount, `isDesktop` reflects the true viewport width.
  const showDesktopLayout = !mounted || isDesktop;

  // Mobile tab state
  const mobileTab = useUIStore((s) => s.mobileTab);
  const isExecuting = useCodeStore((s) => s.isExecuting);
  const executionStatus = useCodeStore((s) => s.executionStatus);

  // playback loop
  useEffect(() => {
    if (isPlaying) {
      const ms = 500 / speed;
      intervalRef.current = setInterval(() => {
        stepForward();
      }, ms);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, stepForward]);

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const active = document.activeElement;
      if (active?.closest(".monaco-editor")) return;

      if (e.code === "Space") {
        e.preventDefault();
        useTimelineStore.getState().togglePlay();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        useTimelineStore.getState().stepForward();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        useTimelineStore.getState().stepBackward();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ─── Mobile / Tablet: tab-based layout ───
  if (!showDesktopLayout) {
    return (
      <div className="flex flex-col h-screen bg-dark overflow-hidden">
        {/* Blue glow — z-10 so sidebar drawer (z-40/z-50) renders above */}
        <div className="absolute inset-0 pointer-events-none shadow-[0_0_80px_rgba(59,130,246,0.12),0_0_200px_rgba(59,130,246,0.05)] z-10" />

        <Header />

        {/* Sidebar rendered as drawer overlay (positioned fixed inside Sidebar) */}
        <Sidebar />

        {/* AlgorithmInfo — always visible */}
        <div className="shrink-0 px-2 pt-2 sm:px-3 sm:pt-3">
          <AlgorithmInfo />
        </div>

        {/* Tab bar */}
        <MobileTabBar />

        {/* Tab panels — both rendered, inactive hidden to keep Monaco alive */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* ── Code tab ── */}
          <div
            className={`flex-1 min-h-0 flex flex-col px-2 pt-2 pb-2 sm:px-3 sm:pt-3 sm:pb-3 gap-2 sm:gap-3 ${
              mobileTab === "code" ? "" : "hidden"
            }`}
          >
            {/* Editor fills available space */}
            <div className="flex flex-col flex-1 min-h-0">
              <EditorPanel />
            </div>

            {/* Run button — triggers run + switches to Visualize tab */}
            <button
              onClick={() => {
                useUIStore.getState().requestRun();
                useUIStore.getState().setMobileTab("visualize");
              }}
              disabled={isExecuting}
              className="w-full py-3 text-sm font-semibold bg-accent text-black rounded-(--radius-panel) hover:bg-accent-hover active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed shrink-0"
            >
              {isExecuting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full" />
                  {executionStatus || "Running…"}
                </span>
              ) : (
                "Run Simulation"
              )}
            </button>
          </div>

          {/* ── Visualize tab ── */}
          <div
            className={`flex-1 min-h-0 overflow-y-auto px-2 pt-2 pb-2 sm:px-3 sm:pt-3 sm:pb-3 flex flex-col gap-2 sm:gap-3 ${
              mobileTab === "visualize" ? "" : "hidden"
            }`}
          >
            <PlaybackControls />
            <VisualizationGrid />
          </div>
        </div>
      </div>
    );
  }

  // ─── Desktop: original horizontal resizable layout ───
  return (
    <div className="flex flex-col h-screen bg-dark overflow-hidden">
      {/* Blue glow — z-10 so sidebar drawer (z-40/z-50) renders above */}
      <div className="absolute inset-0 pointer-events-none shadow-[0_0_80px_rgba(59,130,246,0.12),0_0_200px_rgba(59,130,246,0.05)] z-10" />

      <Header />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />

        {/* Resizable main panels */}
        <Group className="flex-1">
          {/* Left: Info + Editor */}
          <Panel id="editor" defaultSize={55} minSize={30}>
            <div className="flex flex-col h-full p-3 gap-3">
              <AlgorithmInfo />
              <EditorPanel />
            </div>
          </Panel>

          <ResizeHandle />

          {/* Right: Controls + Grid panels */}
          <Panel id="controls" defaultSize={45} minSize={25}>
            <div className="flex flex-col h-full p-3 gap-3">
              <PlaybackControls />
              <div className="flex-1 min-h-0 overflow-hidden">
                <VisualizationGrid />
              </div>
            </div>
          </Panel>
        </Group>
      </div>
    </div>
  );
}
