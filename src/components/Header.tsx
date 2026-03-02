"use client";

import { IconLogo } from "./icons";

export default function Header() {
  return (
    <header className="flex items-center justify-between h-12 px-4 bg-surface border-b border-border shrink-0">
      <div className="flex items-center gap-2.5">
        <IconLogo size={22} />
        <span className="text-sm font-semibold tracking-tight text-text-primary">
          BigOSee
        </span>
        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-accent text-black rounded-sm">
          v1.0
        </span>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-text-muted">
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-surface-hover border border-border rounded text-text-secondary text-[10px] font-mono">
            Space
          </kbd>
          <span>Play</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-surface-hover border border-border rounded text-text-secondary text-[10px] font-mono">
            ← →
          </kbd>
          <span>Step</span>
        </div>
      </div>
    </header>
  );
}
