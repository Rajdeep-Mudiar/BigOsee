"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { CATEGORY_ICONS, IconCollapse, IconExpand, IconSearch } from "./icons";
import { ALGORITHM_DATA, type Difficulty } from "@/data/algorithms";
import { useCodeStore } from "@/stores/codeStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useUIStore } from "@/stores/uiStore";
import { useBreakpoint } from "@/hooks/useBreakpoint";

// difficulty badge colors
const DIFF_COLORS: Record<Difficulty, string> = {
  E: "text-green bg-green/15",
  M: "text-accent bg-accent/15",
  H: "text-red bg-red/15",
};

// chevron icon for accordion
function IconChevron({ open, size = 10 }: { open: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}
    >
      <path
        d="M3 2l4 3-4 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// close icon for drawer
function IconClose({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/** Shared sidebar content used in both desktop aside and mobile drawer */
function SidebarContent({ onSelectQuestion }: { onSelectQuestion?: () => void }) {
  const [search, setSearch] = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const { activeQuestionId, setActiveQuestion } = useCodeStore();
  const reset = useTimelineStore((s) => s.reset);

  const toggleCat = useCallback((name: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (id: string, code: string) => {
      setActiveQuestion(id, code);
      reset();
      onSelectQuestion?.();
    },
    [setActiveQuestion, reset, onSelectQuestion],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return ALGORITHM_DATA;
    return ALGORITHM_DATA.map((cat) => ({
      ...cat,
      questions: cat.questions.filter(
        (q2) =>
          q2.name.toLowerCase().includes(q) ||
          cat.name.toLowerCase().includes(q),
      ),
    })).filter((cat) => cat.questions.length > 0);
  }, [search]);

  const totalCount = ALGORITHM_DATA.reduce((s, c) => s + c.questions.length, 0);

  return (
    <>
      {/* Library header */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[10px] font-semibold tracking-widest text-text-muted uppercase">
          Library
        </span>
        <span className="text-[10px] font-mono text-text-muted">
          {totalCount}
        </span>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-dark border border-border rounded-md">
          <IconSearch size={12} className="text-text-muted shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>
      </div>

      {/* Categories with accordion */}
      <div className="flex-1 overflow-y-auto px-1">
        {filtered.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.name];
          const isExpanded = expandedCats.has(cat.name) || search.length > 0;

          return (
            <div key={cat.name}>
              {/* Category header */}
              <button
                onClick={() => toggleCat(cat.name)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors group"
              >
                <span className="shrink-0 text-text-muted">
                  <IconChevron open={isExpanded} />
                </span>
                <span className="shrink-0">
                  {Icon ? <Icon size={16} /> : null}
                </span>
                <span className="text-xs truncate flex-1">{cat.name}</span>
                <span className="text-[10px] font-mono text-text-muted bg-dark px-1.5 py-0.5 rounded">
                  {cat.questions.length}
                </span>
              </button>

              {/* Questions list */}
              {isExpanded && (
                <div className="ml-5 border-l border-border/50">
                  {cat.questions.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => handleSelect(q.id, q.code)}
                      className={`w-full flex items-center gap-1.5 pl-3 pr-2 py-1.5 text-left transition-colors text-[11px] ${
                        activeQuestionId === q.id
                          ? "bg-accent/10 text-accent"
                          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                      }`}
                    >
                      <span className="truncate flex-1">{q.name}</span>
                      <span
                        className={`text-[9px] font-bold px-1 py-px rounded shrink-0 ${DIFF_COLORS[q.difficulty]}`}
                      >
                        {q.difficulty}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { isDesktop } = useBreakpoint();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  // Close drawer when switching to desktop
  useEffect(() => {
    if (isDesktop && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isDesktop, sidebarOpen, setSidebarOpen]);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (!isDesktop && sidebarOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isDesktop, sidebarOpen]);

  // ─── Mobile / Tablet: slide-over drawer ───
  if (!isDesktop) {
    return (
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
            sidebarOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />

        {/* Drawer panel */}
        <aside
          className={`fixed top-0 left-0 z-50 flex flex-col w-72 h-full bg-surface border-r border-border shadow-xl transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Drawer header with close button */}
          <div className="flex items-center justify-between px-3 h-10 border-b border-border shrink-0">
            <span className="text-xs font-semibold text-text-primary">
              Algorithm Library
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
              aria-label="Close sidebar"
            >
              <IconClose size={16} />
            </button>
          </div>

          <SidebarContent onSelectQuestion={() => setSidebarOpen(false)} />
        </aside>
      </>
    );
  }

  // ─── Desktop: original collapsible sidebar ───

  // collapsed state — icon strip
  if (collapsed) {
    return (
      <aside className="flex flex-col w-12 bg-surface border-r border-border shrink-0 transition-all duration-200">
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center h-10 text-text-muted hover:text-text-primary transition-colors"
          title="Expand"
        >
          <IconExpand size={12} />
        </button>
        {/* Rotated LIBRARY label */}
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-semibold tracking-[0.2em] text-text-muted uppercase -rotate-90 whitespace-nowrap">
            Library
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col w-56 bg-surface border-r border-border shrink-0 transition-all duration-200">
      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(true)}
        className="flex items-center gap-1.5 px-3 h-9 text-xs text-text-muted hover:text-text-primary transition-colors border-b border-border"
      >
        <IconCollapse size={12} />
        <span>Collapse</span>
      </button>

      <SidebarContent />
    </aside>
  );
}
