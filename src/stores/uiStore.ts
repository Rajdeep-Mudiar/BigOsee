import { create } from "zustand";

type MobileTab = "code" | "visualize";

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  /** Active tab on mobile/tablet layouts */
  mobileTab: MobileTab;
  setMobileTab: (tab: MobileTab) => void;

  /** Incremented to request a simulation run from outside PlaybackControls */
  runRequested: number;
  requestRun: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  mobileTab: "code",
  setMobileTab: (tab) => set({ mobileTab: tab }),

  runRequested: 0,
  requestRun: () => set((s) => ({ runRequested: s.runRequested + 1 })),
}));
