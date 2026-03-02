"use client";

import { useEffect, useRef } from "react";
import { useTimelineStore } from "@/stores/timelineStore";
import dynamic from "next/dynamic";
import { Panel, Group, Separator } from "react-resizable-panels";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import AlgorithmInfo from "@/components/AlgorithmInfo";
import PlaybackControls from "@/components/PlaybackControls";

const EditorPanel = dynamic(() => import("@/components/EditorPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center rounded-(--radius-panel) border border-border bg-surface">
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
      <div className="flex-1 flex items-center justify-center">
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

export default function Home() {
  const { isPlaying, speed, stepForward } = useTimelineStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  return (
    <div className="flex flex-col h-screen bg-dark overflow-hidden">
      {/* Blue glow */}
      <div className="absolute inset-0 pointer-events-none shadow-[0_0_80px_rgba(59,130,246,0.12),0_0_200px_rgba(59,130,246,0.05)] z-50" />

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
